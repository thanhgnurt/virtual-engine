export * from "./dom";

export interface VirtualRange {
  start: number;
  end: number;
  changed?: boolean;
}

export interface EngineOptions {
  totalCount: number;
  itemHeight: number;
  viewportHeight: number;
  buffer: number;
}

export const VELOCITY_THRESHOLD = 2; // px/ms
export const DYNAMIC_BUFFER_FAST_SCROLL = 10; // rows
export const SCROLL_STOP_DELAY = 150; // ms

export class VirtualEngine {
  private _tc: number = 0; // totalCount
  private _ih: number = 0; // itemHeight
  private _vh: number = 0; // viewportHeight
  private _b: number = 0;  // buffer
  private _v: number = 0;  // smoothed velocity
  private _lastST: number = 0; // last scrollTop
  private _lastS: number = -1; // last start
  private _lastE: number = -1; // last end
  private _lastTS: number = 0; // last timestamp
  private _r: VirtualRange = { start: 0, end: 0 };

  constructor(options: EngineOptions) {
    this._tc = options.totalCount;
    this._ih = options.itemHeight;
    this._vh = options.viewportHeight;
    this._b = options.buffer;
  }

  updateOptions(options: Partial<EngineOptions>) {
    if (options.totalCount !== undefined) this._tc = options.totalCount;
    if (options.itemHeight !== undefined) this._ih = options.itemHeight;
    if (options.viewportHeight !== undefined) this._vh = options.viewportHeight;
    if (options.buffer !== undefined) this._b = options.buffer;
  }

  computeRange(scrollTop: number, extraBuffer?: number): VirtualRange {
    const buffer = extraBuffer ?? this._b;
    const start = (scrollTop / this._ih) | 0;
    const visibleCount = Math.ceil(this._vh / this._ih);

    const nextS = Math.max(0, start - buffer);
    const nextE = Math.min(this._tc - 1, start + visibleCount + buffer);
    
    const changed = nextS !== this._lastS || nextE !== this._lastE;
    this._lastS = nextS;
    this._lastE = nextE;

    this._r.start = nextS;
    this._r.end = nextE;
    this._r.changed = changed;

    return this._r;
  }

  getSlotMap(
    range: VirtualRange,
    poolSize: number,
    out: Int32Array,
  ): Int32Array {
    out.fill(-1, 0, poolSize);
    for (let i = range.start; i <= range.end; i++) {
      if (i >= 0 && i < this._tc) {
        out[i % poolSize] = i;
      }
    }
    return out;
  }

  updateVelocity(scrollTop: number, now: number): number {
    const dt = now - this._lastTS;
    if (dt <= 0 || dt > 100) {
      this._lastTS = now;
      this._lastST = scrollTop;
      return this._v;
    }
    const instantV = Math.abs(scrollTop - this._lastST) / dt;
    this._lastTS = now;
    this._lastST = scrollTop;
    this._v = instantV * 0.7 + this._v * 0.3;
    return this._v;
  }

  getVelocity(): number {
    return this._v;
  }

  resetVelocity() {
    this._v = 0;
  }

  getDynamicBuffer(velocity?: number): number {
    const v = velocity ?? this._v;
    return v > VELOCITY_THRESHOLD ? DYNAMIC_BUFFER_FAST_SCROLL : this._b;
  }

  getPoolSize(overhead: number, maxPool: number): number {
    return Math.min(Math.ceil(this._vh / this._ih) + overhead, maxPool);
  }

  getScrollPos(
    index: number,
    align: "start" | "end" | "center" | "auto" | "smart",
    currentST: number,
    padY: number = 0,
  ): number {
    const itemTop = index * this._ih + padY;
    switch (align) {
      case "start":
        return itemTop;
      case "end":
        return itemTop - this._vh + this._ih;
      case "center":
        return itemTop - this._vh / 2 + this._ih / 2;
      case "smart":
      case "auto":
      default: {
        const isAbove = itemTop < currentST;
        const isBelow = itemTop + this._ih > currentST + this._vh;
        if (!isAbove && !isBelow) return currentST;
        return isAbove ? itemTop : itemTop - this._vh + this._ih;
      }
    }
  }

  getTotalSize(paddingVertical: number = 0) {
    return this._tc * this._ih + paddingVertical * 2;
  }
}
