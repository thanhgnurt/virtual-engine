import { BaseModule } from "../../core/BaseModule";
import { ChatStore } from "../../index";
import { ChatEvent } from "../../types";



/**
 * The unified Layout and Positioning Engine.
 * Manages viewport anchoring, physical DOM positioning, and height synchronization.
 */
export class LayoutModule extends BaseModule<ChatStore, ChatEvent> {
  public interests: ChatEvent[] = [
    ChatEvent.HISTORY_CHANGED,
    ChatEvent.STREAM_STATE_CHANGED,
    ChatEvent.RANGE_CHANGED,
    ChatEvent.ITEM_HEIGHT_CHANGED,
  ];

  private activeMinHeightIdx: number = -1;
  private anchor = { index: -1, offset: 0 };
  public isAnchoring: boolean = false;

  private get MAX_POOL() {
    return this.store.poolSize;
  }

  // Virtual DOM mapping states
  private lastIds: (unknown | null)[] = new Array(128).fill(null);
  private lastIndices: Int32Array = new Int32Array(128).fill(-2);
  private lastVis: Uint8Array = new Uint8Array(128).fill(0);
  private lastOffsets: Float64Array = new Float64Array(128).fill(-1);

  public calculateAndApplyMinHeight(index: number): void {
    const viewH = window.innerHeight;
    const headerH =
      document.querySelector(".gemini-header")?.clientHeight || 64;
    const footerH =
      document.querySelector(".gemini-footer")?.clientHeight || 100;

    const preciseMinHeight = `${Math.max(300, viewH - headerH - footerH - 10)}px`;

    // Clear previous one if any
    if (this.activeMinHeightIdx !== -1 && this.activeMinHeightIdx !== index) {
      this.store.historyModule.updateMessageMetadata(this.activeMinHeightIdx, {
        minHeight: null,
      });
    }

    this.activeMinHeightIdx = index;
    this.store.historyModule.updateMessageMetadata(index, {
      minHeight: preciseMinHeight,
    });
  }

  public clearMinHeight(index: number): void {
    this.store.historyModule.updateMessageMetadata(index, { minHeight: null });
    if (this.activeMinHeightIdx === index) {
      this.activeMinHeightIdx = -1;
    }
  }

  // --- Scroll Anchoring & Rendering ---

  public recordAnchor() {
    this.isAnchoring = true;
    this.store.resizeModule.setAnchoring(true);
    const container = this.store.dom.getContainer();
    const currentEngine = this.store.virtualModule.getEngine();
    if (!container || !currentEngine) return;

    const st = container.scrollTop;
    const idx = currentEngine.indexAt(st);
    if (idx >= 0) {
      this.anchor = {
        index: idx,
        offset: currentEngine.getOffset(idx) - st,
      };
    }
  }

  public applyAnchor() {
    const container = this.store.dom.getContainer();
    const { index, offset } = this.anchor;
    const currentEngine = this.store.virtualModule.getEngine();

    if (!container || index < 0 || !currentEngine) {
      this.isAnchoring = false;
      this.store.resizeModule.setAnchoring(false);
      return;
    }

    const newOffset = currentEngine.getOffset(index);
    const targetScrollTop = newOffset - offset;

    if (Math.abs(container.scrollTop - targetScrollTop) > 0.5) {
      this.isAnchoring = true;
      container.scrollTop = targetScrollTop;
      queueMicrotask(() => {
        this.isAnchoring = false;
        this.store.resizeModule.setAnchoring(false);
      });
    } else {
      this.isAnchoring = false;
      this.store.resizeModule.setAnchoring(false);
    }
  }

  public updateUI() {
    const currentEngine = this.store.virtualModule.getEngine();
    if (!currentEngine) return;

    this.recordAnchor();

    const range = this.store.virtualModule.getRange();

    // Always manage all MAX_POOL slots. Unused slots will be assigned -1 by the engine.
    const slotMap = new Int32Array(this.MAX_POOL);
    currentEngine.getSlotMap(range, this.MAX_POOL, slotMap);

    const history = this.store.state.history;

    for (let s = 0; s < this.MAX_POOL; s++) {
      const i = slotMap[s];
      const isOutOfRange = i === -1;
      const item = isOutOfRange ? null : history[i];
      const isVisible = !isOutOfRange;
      const isContentChanged =
        this.lastIds[s] !== item || this.lastIndices[s] !== i;
      const isVisChanged = this.lastVis[s] !== (isVisible ? 1 : 0);
      let top = isOutOfRange ? -9999 : currentEngine.getOffset(i);

      // Poison control: if top is NaN, fallback to -9999 to avoid CSS breakage
      if (isNaN(top)) {
        top = -9999;
      }
      
      const isOffsetChanged = this.lastOffsets[s] !== top;

      if (isContentChanged || isVisChanged || isOffsetChanged) {
        const wrapper = this.store.dom.getWrapper(s);
        if (wrapper) {
          wrapper.style.transform = `translateY(${top}px)`;
          wrapper.style.visibility = isVisible ? "visible" : "hidden";
        }
        this.lastIds[s] = item;
        this.lastIndices[s] = i;
        this.lastVis[s] = isVisible ? 1 : 0;
        this.lastOffsets[s] = top;

        const slotHandle = this.store.dom.getHandle(s);
        if (slotHandle && (isContentChanged || isVisChanged)) {
          slotHandle.update(item, i, wrapper, isVisible);
        }
      }
    }

    const content = this.store.dom.getContent();
    if (content) {
      content.style.height = `${currentEngine.getTotalHeight()}px`;
    }

    this.applyAnchor();
  }

  public syncHeightReal(
    index: number,
    slotIndex: number | undefined,
    height: number,
  ): boolean {
    const container = this.store.dom.getContainer();
    const currentEngine = this.store.virtualModule.getEngine();

    if (index < 0 || !container || !currentEngine) return false;
    if (height <= 0) return false;

    const oldH = currentEngine.getHeight(index);
    const item = this.store.state.history[index];
    const isLoading = item?.metadata?.isLoading === true;
    
    // Fallback oldH to 0 if it's undefined/NaN to prevent poison
    const safeOldH = isNaN(oldH) || oldH === undefined ? 0 : oldH;
    const safeHeight = isNaN(height) || height === undefined ? 0 : height;
    
    const finalH = isLoading ? Math.max(safeOldH, safeHeight) : safeHeight;

    if (isNaN(finalH) || finalH <= 0 || Math.abs(finalH - safeOldH) < 0.5) return false;

    const changed = currentEngine.setHeight(index, finalH);
    if (changed) {
      // Force the virtual engine to recompute its internal offset caches
      // This emits RANGE_CHANGED, which will automatically trigger this.updateUI()
      this.store.virtualModule.refreshRange();
    }
    return changed;
  }

  public getIndexInSlot(slotIndex: number): number {
    return this.lastIndices[slotIndex];
  }

  public override onNotify(
    event: ChatEvent,
    id?: string | number,
    payload?: any,
  ): void {
    if (event === ChatEvent.RANGE_CHANGED || event === ChatEvent.HISTORY_CHANGED) {
      this.updateUI();
    } else if (event === ChatEvent.ITEM_HEIGHT_CHANGED && payload) {
      const { index, slotIndex, height } = payload;
      if (index >= 0) {
        this.syncHeightReal(index, slotIndex, height);
      }
    }
  }
}
