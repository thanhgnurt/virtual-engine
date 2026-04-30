import { BaseModule } from '../../core/BaseModule';
import { ChatEvent } from '../../types';
import { ChatStore } from '../../index';

/**
 * Manages layout-related logic, such as dynamic min-height and height synchronization.
 */
export class LayoutModule extends BaseModule<ChatStore, ChatEvent> {
  public interests: ChatEvent[] = [ChatEvent.STREAM_STATE_CHANGED];

  private activeMinHeightIdx: number = -1;
  private anchor = { index: -1, offset: 0 };

  public calculateAndApplyMinHeight(index: number): void {
    const viewH = window.innerHeight;
    const headerH = document.querySelector(".gemini-header")?.clientHeight || 64;
    const footerH = document.querySelector(".gemini-footer")?.clientHeight || 100;
    
    const preciseMinHeight = `${Math.max(300, viewH - headerH - footerH - 10)}px`;
    
    // Clear previous one if any
    if (this.activeMinHeightIdx !== -1 && this.activeMinHeightIdx !== index) {
      this.store.historyModule.updateMessageMetadata(this.activeMinHeightIdx, { minHeight: null });
    }

    this.activeMinHeightIdx = index;
    this.store.historyModule.updateMessageMetadata(index, { minHeight: preciseMinHeight });
  }

  public syncHeight(index: number): boolean {
    const row = this.store.dom.getRowElement(index);
    const engine = this.store.virtualModule.getEngine();
    if (!row || !engine) return false;

    const h = row.offsetHeight;
    if (h <= 0) return false;

    const oldH = engine.getHeight(index);
    // Don't shrink assistant messages while loading
    const item = this.store.state.history[index];
    const isLoading = item?.metadata?.isLoading === true;
    const finalH = isLoading ? Math.max(oldH, h) : h;

    if (Math.abs(finalH - oldH) < 0.5) return false;

    return engine.setHeight(index, finalH);
  }

  public recordAnchor(scrollTop: number) {
    const engine = this.store.virtualModule.getEngine();
    if (!engine) return;
    const idx = engine.indexAt(scrollTop);
    if (idx >= 0) {
      this.anchor = {
        index: idx,
        offset: engine.getOffset(idx) - scrollTop
      };
    }
  }

  public getAnchorScrollTop(): number | null {
    const engine = this.store.virtualModule.getEngine();
    if (!engine || this.anchor.index < 0) return null;
    return engine.getOffset(this.anchor.index) - this.anchor.offset;
  }

  public clearMinHeight(index: number): void {
    this.store.historyModule.updateMessageMetadata(index, { minHeight: null });
    if (this.activeMinHeightIdx === index) {
      this.activeMinHeightIdx = -1;
    }
  }

  public override onNotify(event: ChatEvent, id?: string | number, payload?: any): void {
    // Logic for stream completion etc.
  }
}
