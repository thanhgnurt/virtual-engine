import { BaseModule } from "../../core/BaseModule";
import { ChatEvent } from "../../types";

/**
 * Manages global UI elements and their visibility states imperatively.
 */
export class UIStatusModule extends BaseModule<any, ChatEvent> {
  private typingEl: HTMLElement | null = null;

  /**
   * Registers the DOM element for the typing indicator.
   */
  public registerTypingIndicator(el: HTMLElement | null) {
    this.typingEl = el;
  }

  /**
   * Toggles the visibility of the typing indicator.
   */
  public setTyping(isVisible: boolean) {
    if (this.typingEl) {
      this.typingEl.style.display = isVisible ? "flex" : "none";
    }
  }

  /**
   * Helper to set typing based on stream events automatically
   * (Optional: could be used to auto-show/hide based on store events)
   */
  public init() {
    this.store.subscribe(ChatEvent.STREAM_STATE_CHANGED, () => {
      // Auto-hide when streaming stops, but show logic is usually handled by sendMessage
      if (!this.store.state.isStreaming) {
        this.setTyping(false);
      }
    });
  }
}
