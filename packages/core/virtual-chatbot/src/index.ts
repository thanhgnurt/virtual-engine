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

export class VirtualChatbot {
  private _tc: number = 0;
  private _eh: number = 0;
  private _vh: number = 0;
  private _b: number = 0;

  // item heights and their offsets (prefix sums)
  private _heights: number[] = [];
  private _offsets: number[] = [];

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
    this._recomputeOffsets();
  }

  private _recomputeOffsets() {
    this._offsets = new Array(this._tc + 1);
    this._offsets[0] = 0;
    for (let i = 0; i < this._tc; i++) {
      this._offsets[i + 1] = this._offsets[i] + this._heights[i];
    }
  }

  updateOptions(options: Partial<VirtualChatbotOptions>) {
    let reinit = false;
    if (options.totalCount !== undefined && options.totalCount !== this._tc) {
      if (options.totalCount > this._tc) {
        // Appended or prepended
        // For simplicity, we'll reinit if counts changed significantly
        // In a real chat, we might want to handle prepending vs appending
      }
      this._tc = options.totalCount;
      reinit = true; 
    }
    if (options.estimatedItemHeight !== undefined) this._eh = options.estimatedItemHeight;
    if (options.viewportHeight !== undefined) this._vh = options.viewportHeight;
    if (options.buffer !== undefined) this._b = options.buffer;

    if (reinit) {
      // Basic approach: resize heights array and keep existing measurements if possible
      const newHeights = new Array(this._tc).fill(this._eh);
      for (let i = 0; i < Math.min(this._tc, this._heights.length); i++) {
        newHeights[i] = this._heights[i];
      }
      this._heights = newHeights;
      this._recomputeOffsets();
    }
  }

  setHeight(index: number, height: number): boolean {
    if (index < 0 || index >= this._tc) return false;
    if (this._heights[index] === height) return false;

    const diff = height - this._heights[index];
    this._heights[index] = height;

    // Update all subsequent offsets
    for (let i = index + 1; i <= this._tc; i++) {
      this._offsets[i] += diff;
    }
    return true;
  }

  computeRange(scrollTop: number): VirtualChatbotRange {
    const start = this._findStartIndex(scrollTop);
    const end = this._findEndIndex(scrollTop + this._vh);

    const nextS = Math.max(0, start - this._b);
    const nextE = Math.min(this._tc - 1, end + this._b);

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

  getOffset(index: number): number {
    return this._offsets[index] || 0;
  }

  getTotalHeight(): number {
    return this._offsets[this._tc] || 0;
  }

  getPoolSize(overhead: number, maxPool: number): number {
    const visibleCount = Math.ceil(this._vh / this._eh);
    return Math.min(visibleCount + overhead, maxPool);
  }
}
