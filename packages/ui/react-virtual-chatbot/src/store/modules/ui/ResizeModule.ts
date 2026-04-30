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
        const entry = entries[0];
        if (!entry) return;
        
        // Use borderBoxSize if available for better precision and less layout thrashing
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        this.store.emit(ChatEvent.ITEM_HEIGHT_CHANGED, undefined, { slotIndex, height });
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
