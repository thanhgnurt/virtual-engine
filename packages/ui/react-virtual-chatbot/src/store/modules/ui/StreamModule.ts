import { RAFEngine, TickFn } from "../../../utils/useRequestAnimation";
import { BaseModule } from "../../core/BaseModule";
import { ChatEvent } from "../../types";

/**
 * Manages the high-frequency streaming buffer and UI synchronization.
 * Directs incoming message tokens to the correct DOM slots imperatively.
 */
export class StreamModule extends BaseModule<any, ChatEvent> {
  private updateBuffer: Map<number, string> = new Map();
  private rafTick: TickFn | null = null;

  public init() {
    // Subscribe to message updates (streaming tokens)
    this.store.subscribe(ChatEvent.MESSAGE_UPDATED, (id) => {
      if (typeof id === "number") {
        const item = this.store.state.history[id];
        if (item) {
          // Turn off loading state on first update
          if (item.metadata?.isLoading) {
            this.store.historyModule.updateMessageMetadata(id, { isLoading: false });
            this.store.uiStatusModule.setTyping(false);
            
            // Get the updated item and force slot update
            const updatedItem = this.store.state.history[id];
            for (let s = 0; s < 40; s++) {
              if (this.store.layoutModule.getIndexInSlot(s) === id) {
                const slot = this.store.dom.getHandle(s);
                if (slot) {
                  slot.update(updatedItem);
                }
                break;
              }
            }
          }

          const fullContent =
            item.parts && item.parts[0]
              ? item.parts[0].content
              : item.content || "";

          this.updateBuffer.set(id, fullContent);

          // Start the tick if not already running
          if (!this.rafTick) {
            this.rafTick = RAFEngine.getInstance().addTick({
              intervalTime: 0,
              lastFlush: performance.now(),
              actionRef: { current: this.onTick.bind(this) },
            });
          }
        }
      }
    });

    // Cleanup when streaming ends globally
    this.store.subscribe(ChatEvent.STREAM_STATE_CHANGED, () => {
      if (!this.store.state.isStreaming) {
        // We might want to let the buffer flush one last time
        // but eventually we should stop the tick if idle
      }
    });
  }

  private onTick() {
    if (this.updateBuffer.size === 0) return;

    this.updateBuffer.forEach((content, idx) => {
      // Find which slot is currently displaying this message index
      // We use the MAX_POOL from LayoutModule (usually 40)
      for (let s = 0; s < 40; s++) {
        if (this.store.layoutModule.getIndexInSlot(s) === idx) {
          const slot = this.store.dom.getHandle(s);
          if (slot) {
            slot.updateText(content);
          }
          break;
        }
      }
    });

    this.updateBuffer.clear();
  }
}
