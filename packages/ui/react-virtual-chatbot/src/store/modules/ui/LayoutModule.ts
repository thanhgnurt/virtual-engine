import { BaseModule } from '../../core/BaseModule';
import { ChatEvent } from '../../types';

/**
 * Manages layout-related logic, such as dynamic min-height calculations.
 */
export class LayoutModule extends BaseModule<any, ChatEvent> {
  public interests: ChatEvent[] = [ChatEvent.STREAM_STATE_CHANGED];

  private activeMinHeightIdx: number = -1;

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

  public clearMinHeight(index: number): void {
    this.store.historyModule.updateMessageMetadata(index, { minHeight: null });
    if (this.activeMinHeightIdx === index) {
      this.activeMinHeightIdx = -1;
    }
  }

  public override onNotify(event: ChatEvent, id?: string | number, payload?: any): void {
    // We could automate some layout changes here if needed
  }
}
