import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

export type TickSource = 'raf' | 'interval';
export interface TickContext {
  source: TickSource;
  now: number;
  delta: number;
  elapsedHiddenTime?: number;
  hiddenTimestamp: number | null;
}

export type TickFn = {
  actionRef: React.MutableRefObject<(ctx: TickContext) => void>;
  intervalTime: number;
  lastFlush: number;
  id: number;
  paused: boolean;
  hiddenTimestamp: number | null;
  shouldClearHiddenData: boolean;
};

// Bitwise flags
const FLAG_PAUSED = 1 << 0;
const FLAG_REMOVED = 1 << 1;
const FLAG_SHOULD_CLEAR = 1 << 2;

export class RAFEngine {
  private static instance: RAFEngine | null = null;
  private readonly TICK_MAX = 512;

  // SoA pools
  private tickActions: TickFn[] = [];
  private lastFlushPool = new Float64Array(this.TICK_MAX);
  private intervalTimePool = new Float64Array(this.TICK_MAX);
  private hiddenTimestampPool = new Float64Array(this.TICK_MAX);
  private flagsPool = new Uint8Array(this.TICK_MAX);

  private tickIndexMap = new Map<number, number>(); // tickId -> index

  private rafId: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private tickIdCounter = 0;
  private hasVisibilityListener = false;
  private activeTickCount = 0;
  private hiddenTimestamp: number | null = null;

  private contextPool: TickContext[] = [];
  private nextContextIndex = 0;

  private constructor() {
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.processTicks = this.processTicks.bind(this);
    this.rafLoop = this.rafLoop.bind(this);

    for (let i = 0; i < 32; i++) {
      this.contextPool.push({
        source: 'raf',
        now: 0,
        delta: 0,
        hiddenTimestamp: null
      });
    }
  }

  static getInstance(): RAFEngine {
    if (!RAFEngine.instance) {
      RAFEngine.instance = new RAFEngine();
    }
    return RAFEngine.instance;
  }

  private setupVisibilityListener() {
    if (this.hasVisibilityListener) return;
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.hasVisibilityListener = true;
  }

  private handleVisibilityChange() {
    this.stopEngine();

    if (!document.hidden) {
      const now = performance.now();
      this.hiddenTimestamp = null;
      const count = this.tickActions.length;
      for (let i = 0; i < count; i++) {
        this.lastFlushPool[i] = now;
        this.flagsPool[i] &= ~FLAG_SHOULD_CLEAR;
      }
    } else {
      this.hiddenTimestamp = performance.now();
    }

    this.ensureLoop();
  }

  private getContext(): TickContext {
    const ctx = this.contextPool[this.nextContextIndex];
    this.nextContextIndex =
      (this.nextContextIndex + 1) % this.contextPool.length;
    return ctx;
  }

  private executeTickAction(tick: TickFn, ctx: TickContext) {
    try {
      tick.actionRef.current(ctx);
    } catch (e) {
      console.error('[RAFEngine] Error in tick action:', e);
    }
  }

  private processTicks() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const now = performance.now();
    const source: TickSource = this.rafId !== null ? 'raf' : 'interval';
    const isInterval = source === 'interval';
    const globalHidden = this.hiddenTimestamp;

    let hasDeferredRemovals = false;

    try {
      const count = this.tickActions.length;
      const actions = this.tickActions;
      const lastFlushPool = this.lastFlushPool;
      const intervalTimePool = this.intervalTimePool;
      const hiddenTimestampPool = this.hiddenTimestampPool;
      const flagsPool = this.flagsPool;

      for (let i = 0; i < count; i++) {
        const flags = flagsPool[i];

        if (flags & (FLAG_PAUSED | FLAG_REMOVED)) {
          if (flags & FLAG_REMOVED) hasDeferredRemovals = true;
          continue;
        }

        const intervalTime = intervalTimePool[i];
        const lastFlush = lastFlushPool[i];
        const delta = now - lastFlush;

        if (delta >= intervalTime) {
          if (intervalTime <= 0) {
            lastFlushPool[i] = now;
          } else {
            const missedTicks = (delta / intervalTime) | 0;
            if (missedTicks > 5) {
              lastFlushPool[i] = now;
            } else {
              lastFlushPool[i] += missedTicks * intervalTime;
            }
          }

          const ctx = this.getContext();
          ctx.source = source;
          ctx.now = now;
          ctx.delta = delta;

          const tick = actions[i];

          if (isInterval) {
            if (hiddenTimestampPool[i] === 0) {
              hiddenTimestampPool[i] = now;
            }

            ctx.elapsedHiddenTime =
              globalHidden !== null ? now - globalHidden : 0;
            ctx.hiddenTimestamp = hiddenTimestampPool[i];
            this.executeTickAction(tick, ctx);
          } else {
            const hiddenTime = hiddenTimestampPool[i];
            const hasHiddenData = hiddenTime !== 0;
            const shouldClear = (flags & FLAG_SHOULD_CLEAR) !== 0;

            ctx.elapsedHiddenTime = shouldClear
              ? undefined
              : hasHiddenData
                ? now - hiddenTime
                : globalHidden !== null
                  ? now - globalHidden
                  : undefined;
            ctx.hiddenTimestamp = shouldClear
              ? null
              : hasHiddenData
                ? hiddenTime
                : null;

            this.executeTickAction(tick, ctx);

            if (shouldClear) {
              hiddenTimestampPool[i] = 0;
              flagsPool[i] &= ~FLAG_SHOULD_CLEAR;
            } else if (hasHiddenData) {
              flagsPool[i] |= FLAG_SHOULD_CLEAR;
            }
          }
        }
      }
    } finally {
      this.isProcessing = false;

      if (hasDeferredRemovals) {
        this.cleanupRemovedTicks();
      }

      if (this.activeTickCount === 0) {
        this.stopEngine();
      }
    }
  }

  // Batch removal with single-pass compaction
  private cleanupRemovedTicks() {
    const actions = this.tickActions;
    const count = actions.length;
    let writeIdx = 0;

    for (let i = 0; i < count; i++) {
      const flags = this.flagsPool[i];
      if (flags & FLAG_REMOVED) {
        this.tickIndexMap.delete(actions[i].id);
        continue;
      }

      if (writeIdx !== i) {
        const tick = actions[i];
        actions[writeIdx] = tick;
        this.lastFlushPool[writeIdx] = this.lastFlushPool[i];
        this.intervalTimePool[writeIdx] = this.intervalTimePool[i];
        this.hiddenTimestampPool[writeIdx] = this.hiddenTimestampPool[i];
        this.flagsPool[writeIdx] = flags;

        this.tickIndexMap.set(tick.id, writeIdx);
      }
      writeIdx++;
    }

    const removedCount = count - writeIdx;
    if (removedCount > 0) {
      actions.length = writeIdx;
    }
  }

  private rafLoop() {
    this.processTicks();

    if (this.rafId !== null && this.activeTickCount > 0) {
      this.rafId = requestAnimationFrame(this.rafLoop);
    } else {
      this.rafId = null;
    }
  }

  private stopEngine() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isProcessing = false;
  }

  private ensureLoop() {
    if (this.rafId !== null || this.intervalId !== null) return;
    if (this.tickActions.length === 0) return;
    if (this.activeTickCount === 0) return;

    if (typeof document !== 'undefined' && document.hidden) {
      this.intervalId = setInterval(this.processTicks, 200);
    } else {
      this.rafId = requestAnimationFrame(this.rafLoop);
    }
  }

  addTick(
    tick: Omit<
      TickFn,
      'id' | 'paused' | 'hiddenTimestamp' | 'shouldClearHiddenData'
    >
  ): TickFn {
    const index = this.tickActions.length;
    if (index >= this.TICK_MAX) {
      throw new Error(
        `[RAFEngine] Maximum tick limit (${this.TICK_MAX}) reached`
      );
    }

    const tickWithId: TickFn = {
      ...tick,
      id: this.tickIdCounter++,
      paused: false,
      hiddenTimestamp: null,
      shouldClearHiddenData: false
    };

    this.tickActions.push(tickWithId);
    this.tickIndexMap.set(tickWithId.id, index);

    const now = performance.now();
    this.lastFlushPool[index] = now;
    this.intervalTimePool[index] = tick.intervalTime;
    this.hiddenTimestampPool[index] = 0;
    this.flagsPool[index] = 0;

    this.activeTickCount++;
    this.setupVisibilityListener();
    this.ensureLoop();

    return tickWithId;
  }

  removeTick(tick: TickFn) {
    const index = this.tickIndexMap.get(tick.id);
    if (index === undefined) return;

    const flags = this.flagsPool[index];
    if (flags & FLAG_REMOVED) return;

    const wasPaused = (flags & FLAG_PAUSED) !== 0;

    // FIX: Luôn dùng deferred removal thay vì swap-and-pop
    // swap-and-pop gây index corruption khi remove nhiều tick liên tiếp
    this.flagsPool[index] |= FLAG_REMOVED;

    if (!wasPaused) {
      this.activeTickCount--;
    }

    tick.paused = true;
    this.activeTickCount = Math.max(0, this.activeTickCount);

    // Nếu không đang processing thì cleanup ngay
    if (!this.isProcessing) {
      this.cleanupRemovedTicks();
    }

    if (this.activeTickCount <= 0) {
      this.stopEngine();
    }
  }

  updateInterval(tick: TickFn, newInterval: number) {
    const index = this.tickIndexMap.get(tick.id);
    if (index !== undefined) {
      this.intervalTimePool[index] = newInterval;
      this.lastFlushPool[index] = performance.now();
      tick.intervalTime = newInterval;
    }
  }

  pauseTick(tick: TickFn) {
    const index = this.tickIndexMap.get(tick.id);
    if (index === undefined) return;

    const flags = this.flagsPool[index];
    if (flags & (FLAG_PAUSED | FLAG_REMOVED)) return;

    this.flagsPool[index] |= FLAG_PAUSED;
    this.activeTickCount--;
    tick.paused = true;

    if (this.activeTickCount <= 0) {
      this.activeTickCount = 0;
      this.stopEngine();
    }
  }

  resumeTick(tick: TickFn, resetTiming = true) {
    const index = this.tickIndexMap.get(tick.id);
    if (index === undefined) return;

    const flags = this.flagsPool[index];
    if (!(flags & FLAG_PAUSED) || flags & FLAG_REMOVED) return;

    this.flagsPool[index] &= ~FLAG_PAUSED;
    this.activeTickCount++;
    tick.paused = false;

    if (resetTiming) {
      this.lastFlushPool[index] = performance.now();
    }

    this.ensureLoop();
  }

  forceStop() {
    console.log('[RAFEngine] Force stopping all loops');
    this.stopEngine();
  }

  getStats() {
    let activeTicks = 0;
    let pausedTicks = 0;
    const count = this.tickActions.length;

    for (let i = 0; i < count; i++) {
      if (this.flagsPool[i] & FLAG_PAUSED) {
        pausedTicks++;
      } else {
        activeTicks++;
      }
    }

    return {
      tickCount: count,
      activeTicks,
      pausedTicks,
      activeTickCount: this.activeTickCount,
      isRunning: this.rafId !== null || this.intervalId !== null,
      mode:
        this.rafId !== null
          ? 'RAF'
          : this.intervalId !== null
            ? 'interval'
            : 'stopped'
    };
  }

  debugTicks() {
    console.log('\n📊 RAFEngine Debug Info:');
    console.log(`Total ticks: ${this.tickActions.length}`);
    console.log(`Active count: ${this.activeTickCount}`);
    console.log(`Index map size: ${this.tickIndexMap.size}`);

    this.tickActions.forEach((tick, index) => {
      console.log(`  Tick #${tick.id} (index ${index}):`, {
        flags: this.flagsPool[index],
        intervalTime: this.intervalTimePool[index],
        indexMapMatch: this.tickIndexMap.get(tick.id) === index
      });
    });
  }
}

export const useRequestAnimation = (
  { intervalTime }: { intervalTime: number },
  triggerAction: (ctx: TickContext) => void
) => {
  const savedAction = useRef(triggerAction);
  const tickRef = useRef<TickFn | null>(null);
  const engineRef = useRef<RAFEngine>(RAFEngine.getInstance());

  useLayoutEffect(() => {
    savedAction.current = triggerAction;
  }, [triggerAction]);

  useEffect(() => {
    const engine = engineRef.current;
    const tick = engine.addTick({
      actionRef: savedAction,
      intervalTime,
      lastFlush: performance.now()
    });
    tickRef.current = tick;
    return () => {
      if (tickRef.current) {
        engine.removeTick(tickRef.current);
        tickRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (tickRef.current && intervalTime > 0) {
      engine.updateInterval(tickRef.current, intervalTime);
    }
  }, [intervalTime]);

  const setIntervalTime = useCallback((newInterval: number) => {
    const engine = engineRef.current;
    if (tickRef.current && newInterval > 0) {
      engine.updateInterval(tickRef.current, newInterval);
    }
  }, []);

  const pause = useCallback(() => {
    const engine = engineRef.current;
    if (tickRef.current) {
      engine.pauseTick(tickRef.current);
    }
  }, []);

  const resume = useCallback((resetTiming = true) => {
    const engine = engineRef.current;
    if (tickRef.current) {
      engine.resumeTick(tickRef.current, resetTiming);
    }
  }, []);

  return { setIntervalTime, pause, resume };
};

export const useRAFEngineStats = () => {
  const [stats, setStats] = React.useState(() =>
    RAFEngine.getInstance().getStats()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(RAFEngine.getInstance().getStats());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return stats;
};
