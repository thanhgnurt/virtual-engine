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
  private _tc: number; // totalCount
  private _ih: number; // itemHeight
  private _vh: number; // viewportHeight
  private _b: number;  // buffer
  // Pre-allocated range object reused across computeRange calls to avoid GC pressure
  private _r: VirtualRange = { start: 0, end: 0 };

  constructor(options: EngineOptions) {
    this._tc = options.totalCount;
    this._ih = options.itemHeight;
    this._vh = options.viewportHeight;
    this._b = options.buffer;
  }

  updateOptions(options: Partial<EngineOptions>) {
    if (options.totalCount !== undefined) this._tc = options.totalCount;
    if (options.itemHeight !== undefined) {
      this._ih = options.itemHeight;
    }
    if (options.viewportHeight !== undefined)
      this._vh = options.viewportHeight;
    if (options.buffer !== undefined) this._b = options.buffer;
  }

  computeRange(scrollTop: number, extraBuffer?: number): VirtualRange {
    const buffer = extraBuffer ?? this._b;
    const start = (scrollTop / this._ih) | 0; // Bitwise floor
    const visibleCount = Math.ceil(this._vh / this._ih);

    this._r.start = Math.max(0, start - buffer);
    this._r.end = Math.min(
      this._tc - 1,
      start + visibleCount + buffer,
    );

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
      : this._b;
  }

  getTotalSize(paddingVertical: number = 0) {
    return this._tc * this._ih + paddingVertical * 2;
  }
}
