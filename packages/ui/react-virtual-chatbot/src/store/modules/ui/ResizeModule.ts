import { BaseModule } from "../../core/BaseModule";
import { ChatEvent } from "../../types";

/**
 * Manages ResizeObserver instances for virtual list slots.
 * Highly optimized to measure via entry.borderBoxSize directly without triggering Layout Thrashing.
 */
export class ResizeModule extends BaseModule<any, ChatEvent> {
  private observers: Map<number, ResizeObserver> = new Map();
  private isAnchoring: boolean = false;

  /**
   * Temporarily pauses reporting of height changes during scroll anchoring 
   * to avoid recursive or jittery updates.
   */
  public setAnchoring(isAnchoring: boolean) {
    this.isAnchoring = isAnchoring;
  }

  /**
   * Registers a DOM element for size observation.
   * Disconnects any existing observer for the given slotIndex.
   */
  public register(slotIndex: number, el: HTMLElement | null) {
    const old = this.observers.get(slotIndex);
    if (old) old.disconnect();

    if (el) {
      const obs = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
          
          const node = entry.target as HTMLElement;
          const rowEl = node.querySelector('[data-row-index]') || node;
          const indexStr = rowEl.getAttribute("data-row-index");
          
          if (indexStr) {
            const index = parseInt(indexStr, 10);
            this.store.emit(ChatEvent.ITEM_HEIGHT_CHANGED, undefined, { index, slotIndex, height });
          }
        }
      });
      obs.observe(el);
      this.observers.set(slotIndex, obs);
    } else {
      this.observers.delete(slotIndex);
    }
  }

  public override onDestroy() {
    this.observers.forEach((obs) => obs.disconnect());
    this.observers.clear();
  }
}
