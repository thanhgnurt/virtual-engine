export * from "./dom";

export interface VirtualRange {
  start: number;
  end: number;
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
  private totalCount: number;
  private itemHeight: number;
  private viewportHeight: number;
  private buffer: number;
  // Pre-allocated range object reused across computeRange calls to avoid GC pressure
  private _range: VirtualRange = { start: 0, end: 0 };

  constructor(options: EngineOptions) {
    this.totalCount = options.totalCount;
    this.itemHeight = options.itemHeight;
    this.viewportHeight = options.viewportHeight;
    this.buffer = options.buffer;
  }

  updateOptions(options: Partial<EngineOptions>) {
    if (options.totalCount !== undefined) this.totalCount = options.totalCount;
    if (options.itemHeight !== undefined) {
      this.itemHeight = options.itemHeight;
    }
    if (options.viewportHeight !== undefined)
      this.viewportHeight = options.viewportHeight;
    if (options.buffer !== undefined) this.buffer = options.buffer;
  }

  computeRange(scrollTop: number, extraBuffer?: number): VirtualRange {
    const buffer = extraBuffer ?? this.buffer;
    const start = Math.floor(scrollTop / this.itemHeight);
    const visibleCount = Math.ceil(this.viewportHeight / this.itemHeight);

    this._range.start = Math.max(0, start - buffer);
    this._range.end = Math.min(
      this.totalCount - 1,
      start + visibleCount + buffer,
    );

    return this._range;
  }

  getSlotMap(
    range: VirtualRange,
    poolSize: number,
    out: Int32Array,
  ): Int32Array {
    out.fill(-1, 0, poolSize);
    for (let i = range.start; i <= range.end; i++) {
      if (i >= 0 && i < this.totalCount) {
        out[i % poolSize] = i;
      }
    }
    return out;
  }

  calculateVelocity(
    currentScrollTop: number,
    lastScrollTop: number,
    dt: number,
  ): number {
    return dt > 0 ? Math.abs(currentScrollTop - lastScrollTop) / dt : 0;
  }

  getDynamicBuffer(velocity: number): number {
    return velocity > VELOCITY_THRESHOLD
      ? DYNAMIC_BUFFER_FAST_SCROLL
      : this.buffer;
  }

  getTotalSize(paddingVertical: number = 0) {
    return this.totalCount * this.itemHeight + paddingVertical * 2;
  }
}
