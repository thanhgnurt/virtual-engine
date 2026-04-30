import { BaseModule } from "../../core/BaseModule";
import { ChatEvent } from "../../types";

/**
 * Manages ResizeObserver instances for virtual list slots.
 * Highly optimized to measure via entry.borderBoxSize directly without triggering Layout Thrashing.
 */
export class ResizeModule extends BaseModule<any, ChatEvent> {
  private observers: Map<number, ResizeObserver> = new Map();
  private containerObserver: ResizeObserver | null = null;
  private isAnchoring: boolean = false;

  /**
   * Initializes a ResizeObserver for the main scroller/container.
   * This handles both window resize and container-specific size changes.
   */
  public initContainer(el: HTMLElement | null) {
    if (this.containerObserver) {
      this.containerObserver.disconnect();
      this.containerObserver = null;
    }

    if (el) {
      this.containerObserver = new ResizeObserver((entries) => {
        if (this.isAnchoring) return;
        const entry = entries[0];
        if (!entry) return;

        const height = entry.contentRect.height;
        const currentEngine = this.store.virtualModule.getEngine();
        if (currentEngine && height > 0) {
          // Sync new viewport height to engine
          currentEngine.updateOptions({ viewportHeight: height });
          // Force layout update
          this.store.layoutModule.updateUI();
        }
      });
      this.containerObserver.observe(el);
    }
  }

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
          
          const index = this.store.layoutModule.getIndexInSlot(slotIndex);
          if (index >= 0) {
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
