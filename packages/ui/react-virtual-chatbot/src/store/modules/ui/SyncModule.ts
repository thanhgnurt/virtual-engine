import { setTextNode } from "../../../utils/dom";
import { BaseModule } from "../../core/BaseModule";
import { ChatStore } from "../../index";
import { ChatEvent } from "../../types";

/**
 * Orchestrates direct DOM updates for streaming text.
 * Listens for updates from the StreamModule and pushes them to the Registry.
 */
export class SyncModule extends BaseModule<ChatStore, ChatEvent> {
  public interests: ChatEvent[] = [ChatEvent.MESSAGE_UPDATED];

  private updateBuffer = new Map<number, string>();
  private rafId: number | null = null;

  public override onNotify(
    event: ChatEvent,
    id?: string | number,
    payload?: any,
  ): void {
    if (event === ChatEvent.MESSAGE_UPDATED && typeof id === "number") {
      const item = this.store.state.history[id];
      if (item) {
        const fullContent =
          item.parts && item.parts[0]
            ? item.parts[0].content
            : item.content || "";

        this.updateBuffer.set(id, fullContent);
        this.requestTick();
      }
    }
  }

  private requestTick() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = () => {
    this.rafId = null;
    if (this.updateBuffer.size === 0) return;

    const remaining = new Map<number, string>();

    this.updateBuffer.forEach((content, index) => {
      const isComplex =
        content.includes("```") ||
        content.includes("![") ||
        content.includes("\n");

      if (isComplex) {
        const handle = this.store.dom.getRowHandle(index);
        if (handle && handle.updateText) {
          handle.updateText(content);
        } else {
          remaining.set(index, content); // Retry next tick
        }
      } else {
        const node = this.store.contentRegistryModule.get(index, 0);
        if (node) {
          setTextNode(node, content);
          const parent = node.parentElement;
          if (parent && parent.style.display === "none") {
            parent.style.display = "block";
          }
        } else {
          remaining.set(index, content); // Retry next tick
        }
      }


    });

    this.updateBuffer = remaining;
    if (this.updateBuffer.size > 0) {
      this.requestTick();
    }
  };

  public override onDestroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.updateBuffer.clear();
  }
}
