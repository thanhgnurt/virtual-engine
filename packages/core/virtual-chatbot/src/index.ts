export * from "./dom";
export interface VirtualChatbotRange {
  start: number;
  end: number;
  changed?: boolean;
}

export interface VirtualChatbotOptions {
  totalCount: number;
  estimatedItemHeight: number;
  viewportHeight: number;
  buffer: number;
}

export const VELOCITY_THRESHOLD = 2; // px/ms
export const DYNAMIC_BUFFER_FAST_SCROLL = 10; // rows

export class VirtualChatbot {
  private _tc: number = 0;
  private _eh: number = 0;
  private _vh: number = 0;
  private _b: number = 0;

  // item heights and their offsets (prefix sums)
  private _heights: number[] = [];
  private _offsets: number[] = [];
  private _measured: boolean[] = [];
  private _measuredCount: number = 0;
  private _measuredTotalHeight: number = 0;

  private _v: number = 0;  // smoothed velocity
  private _lastST: number = 0; // last scrollTop
  private _lastTS: number = 0; // last timestamp

  private _lastS: number = -1;
  private _lastE: number = -1;
  private _r: VirtualChatbotRange = { start: 0, end: 0 };

  constructor(options: VirtualChatbotOptions) {
    this._tc = options.totalCount;
    this._eh = options.estimatedItemHeight;
    this._vh = options.viewportHeight;
    this._b = options.buffer;
    this._initHeights();
  }

  private _initHeights() {
    this._heights = new Array(this._tc).fill(this._eh);
    this._measured = new Array(this._tc).fill(false);
    this._measuredCount = 0;
    this._measuredTotalHeight = 0;
    this._recomputeOffsets();
  }

  private _recomputeOffsets(startIndex: number = 0) {
    if (startIndex === 0 || !this._offsets || this._offsets.length !== this._tc + 1) {
      this._offsets = new Array(this._tc + 1);
      this._offsets[0] = 0;
      startIndex = 0;
    }
    
    for (let i = startIndex; i < this._tc; i++) {
      const h = this._measured[i] ? this._heights[i] : this._eh;
      this._offsets[i + 1] = this._offsets[i] + h;
    }
  }

  private _getAverageHeight(): number {
    if (this._measuredCount === 0) return this._eh;
    return this._measuredTotalHeight / this._measuredCount;
  }

  updateOptions(options: Partial<VirtualChatbotOptions>) {
    let reinit = false;
    if (options.totalCount !== undefined && options.totalCount !== this._tc) {
      const prevTc = this._tc;
      this._tc = options.totalCount;

      // Basic resizing of tracking arrays
      const newHeights = new Array(this._tc).fill(this._eh);
      const newMeasured = new Array(this._tc).fill(false);
      
      for (let i = 0; i < Math.min(this._tc, prevTc); i++) {
        newHeights[i] = this._heights[i];
        newMeasured[i] = this._measured[i];
      }
      
      this._heights = newHeights;
      this._measured = newMeasured;
      
      this._measuredCount = 0;
      this._measuredTotalHeight = 0;
      for (let i = 0; i < this._tc; i++) {
        if (this._measured[i]) {
          this._measuredCount++;
          this._measuredTotalHeight += this._heights[i];
        }
      }
      reinit = true; 
    }
    if (options.estimatedItemHeight !== undefined) this._eh = options.estimatedItemHeight;
    if (options.viewportHeight !== undefined) this._vh = options.viewportHeight;
    if (options.buffer !== undefined) this._b = options.buffer;

    if (reinit) {
      this._recomputeOffsets();
    }
  }

  setHeights(updates: Map<number, number>): boolean {
    let changed = false;
    let minIndex = this._tc;
    // Use a small tolerance for subpixel changes to prevent infinite layout loops
    const TOLERANCE = 0.5;

    updates.forEach((height, index) => {
      if (index < 0 || index >= this._tc) return;
      
      const wasMeasured = this._measured[index];
      if (wasMeasured) {
        const diff = Math.abs(height - this._heights[index]);
        if (diff < TOLERANCE) return;
      }

      if (!wasMeasured) {
        this._measured[index] = true;
        this._measuredCount++;
        this._measuredTotalHeight += height;
      } else {
        this._measuredTotalHeight += (height - this._heights[index]);
      }
      
      this._heights[index] = height;
      changed = true;
      if (index < minIndex) minIndex = index;
    });

    if (changed) {
      this._recomputeOffsets(minIndex);
    }
    return changed;
  }

  setHeight(index: number, height: number): boolean {
    const updates = new Map<number, number>();
    updates.set(index, height);
    return this.setHeights(updates);
  }

  computeRange(scrollTop: number, extraBuffer?: number): VirtualChatbotRange {
    const buffer = extraBuffer ?? this._b;
    const start = this._findStartIndex(scrollTop);
    const end = this._findEndIndex(scrollTop + this._vh);

    const nextS = Math.max(0, start - buffer);
    const nextE = Math.min(this._tc - 1, end + buffer);

    const changed = nextS !== this._lastS || nextE !== this._lastE;
    this._lastS = nextS;
    this._lastE = nextE;

    this._r.start = nextS;
    this._r.end = nextE;
    this._r.changed = changed;

    return this._r;
  }

  private _findStartIndex(scrollTop: number): number {
    return this._binarySearch(scrollTop);
  }

  private _findEndIndex(scrollBottom: number): number {
    return this._binarySearch(scrollBottom);
  }

  private _binarySearch(offset: number): number {
    let low = 0;
    let high = this._tc - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const startOffset = this._offsets[mid];
      const endOffset = this._offsets[mid + 1];

      if (offset >= startOffset && offset < endOffset) {
        return mid;
      } else if (offset < startOffset) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return Math.max(0, Math.min(this._tc - 1, low));
  }

  getHeight(index: number): number {
    if (index < 0 || index >= this._tc) return this._eh;
    if (this._measured[index]) return this._heights[index];
    return this._getAverageHeight();
  }

  getOffset(index: number): number {
    return this._offsets[index] || 0;
  }

  getSlotMap(
    range: VirtualChatbotRange,
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

  getTotalHeight(): number {
    return this._offsets[this._tc] || 0;
  }

  getPoolSize(overhead: number, maxPool: number): number {
    const avg = this._getAverageHeight();
    const visibleCount = Math.ceil(this._vh / avg);
    return Math.min(visibleCount + overhead, maxPool);
  }
}
