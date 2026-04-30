import { BaseModule } from "../../core/BaseModule";
import { ChatEvent } from "../../types";

const SCROLL_STOP_DELAY = 150;

/**
 * Manages scroll events, high-frequency scroll tracking via rAF,
 * and scroll-to-bottom state detection.
 */
export class ScrollModule extends BaseModule<any, ChatEvent> {
  private rafId: number | null = null;
  private prevScrollTime: number = 0;
  private el: HTMLElement | null = null;
  
  public isAtBottom: boolean = false;
  private bottomBuffer: number = 0;

  /**
   * Sets a fixed buffer at the bottom of the content (e.g. to avoid being covered by input).
   */
  public setBottomBuffer(h: number) {
    this.bottomBuffer = h;
    this.updateContentHeight();
  }

  private updateContentHeight() {
    const content = this.store.dom.getContent();
    const currentEngine = this.store.virtualModule.getEngine();
    if (content && currentEngine) {
      content.style.height = `${currentEngine.getTotalHeight() + this.bottomBuffer}px`;
    }
  }

  public init(el: HTMLElement | null, initialScrollIndex?: number) {
    if (this.el) {
      this.el.removeEventListener("scroll", this.handleScroll);
    }
    
    this.el = el;
    if (this.el) {
      this.el.addEventListener("scroll", this.handleScroll, { passive: true });
      
      // Auto-sync content height when engine updates
      this.store.subscribe(ChatEvent.HISTORY_CHANGED, () => this.updateContentHeight());
      this.store.subscribe(ChatEvent.RANGE_CHANGED, () => this.updateContentHeight());

      // Handle initial scroll if requested
      if (initialScrollIndex !== undefined) {
        const currentEngine = this.store.virtualModule.getEngine();
        if (currentEngine) {
          const offset = currentEngine.getOffset(initialScrollIndex);
          this.el.scrollTop = offset;
          this.store.virtualModule.handleScroll(offset);
        }
      }
    }
  }

  private handleScroll = () => {
    this.prevScrollTime = performance.now();
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.onRafUpdate);
    }
  };

  private onRafUpdate = () => {
    if (this.store.layoutModule.isAnchoring) {
      this.rafId = null;
      return;
    }

    if (!this.el) {
      this.rafId = null;
      return;
    }

    const currentEngine = this.store.virtualModule.getEngine();
    if (!currentEngine) {
      this.rafId = null;
      return;
    }

    const st = this.el.scrollTop;
    const ch = this.el.clientHeight;
    const actualHeight = currentEngine.getTotalHeight();

    // Update bottom state
    this.isAtBottom = Math.abs(actualHeight - st - ch) < 5;
    
    // Notify virtual engine
    this.store.virtualModule.handleScroll(st);

    // Continue rAF if scrolling is still active or within delay
    if (performance.now() - this.prevScrollTime < SCROLL_STOP_DELAY) {
      this.rafId = requestAnimationFrame(this.onRafUpdate);
    } else {
      this.rafId = null;
      currentEngine.resetVelocity();
    }
  };

  public scrollToBottom() {
    if (this.el) {
      const currentEngine = this.store.virtualModule.getEngine();
      if (currentEngine) {
        const targetST = Math.max(0, currentEngine.getTotalHeight() - this.el.clientHeight);
        this.el.scrollTop = targetST;
        this.store.virtualModule.handleScroll(targetST);
      }
    }
  }

  public scrollToIndex(index: number) {
    if (this.el) {
      const currentEngine = this.store.virtualModule.getEngine();
      if (currentEngine) {
        const offset = currentEngine.getOffset(index);
        this.el.scrollTop = offset;
        this.store.virtualModule.handleScroll(offset);
      }
    }
  }
}
