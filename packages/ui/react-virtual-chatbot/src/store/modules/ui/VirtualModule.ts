import { VirtualChatbot, VirtualChatbotRange } from "virtual-chatbot";
import { BaseModule } from "../../core/BaseModule";
import { ChatStore } from "../../index";
import { ChatEvent } from "../../types";

export class VirtualModule extends BaseModule<ChatStore, ChatEvent> {
  private engine: VirtualChatbot | null = null;
  private lastScrollTop: number = 0;
  private range: VirtualChatbotRange = { start: 0, end: 0 };

  public initEngine(options: {
    totalCount: number;
    estimatedItemHeight: number;
    viewportHeight: number;
    buffer: number;
  }) {
    this.engine = new VirtualChatbot(options);
    this.refreshRange();
  }

  public getEngine() {
    return this.engine;
  }

  public getRange() {
    return this.range;
  }

  public updateViewport(height: number) {
    if (this.engine) {
      this.engine.updateOptions({ viewportHeight: height });
      this.refreshRange();
    }
  }

  public updateTotalCount(count: number) {
    if (this.engine) {
      // 1. Backup all previously measured heights
      // We assume the engine might reset them to estimatedItemHeight internally
      const backupHeights = new Map<number, number>();
      for (let i = 0; i < count; i++) {
        const h = this.engine.getHeight(i);
        if (h > 0) backupHeights.set(i, h);
      }

      this.engine.updateOptions({ totalCount: count });

      // 2. Restore heights to prevent overlaps
      let changed = false;
      backupHeights.forEach((h, i) => {
        if (this.engine!.getHeight(i) !== h) {
          this.engine!.setHeight(i, h);
          changed = true;
        }
      });

      this.refreshRange();
    }
  }

  public handleScroll(scrollTop: number) {
    if (!this.engine) return;
    this.lastScrollTop = scrollTop;

    const velocity = this.engine.updateVelocity(scrollTop, performance.now());
    const buffer = this.engine.getDynamicBuffer(velocity);

    const next = this.engine.computeRange(scrollTop, buffer);
    if (next.changed) {
      this.range = { start: next.start, end: next.end };
      this.store.emit(ChatEvent.RANGE_CHANGED, undefined, this.range);
    }
  }

  public ensureIndexVisible(index: number) {
    if (!this.engine) return;

    if (index >= this.range.end) {
      const next = this.engine.computeRange(this.lastScrollTop, 5);
      if (next.end < index) {
        next.end = index;
      }
      this.range = { start: next.start, end: next.end };
      this.store.emit(ChatEvent.RANGE_CHANGED, undefined, this.range);
    }
  }

  public refreshRange() {
    if (!this.engine) return;
    const next = this.engine.computeRange(this.lastScrollTop, 5);
    this.range = { start: next.start, end: next.end };
    this.store.emit(ChatEvent.RANGE_CHANGED, undefined, this.range);
  }
}
