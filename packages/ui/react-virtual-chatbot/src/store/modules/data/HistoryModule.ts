import { BaseModule } from '../../core/BaseModule';
import { ChatEvent, ChatState } from '../../types';
import { ChatMessage } from '../../../types';

/**
 * Manages the message history and core data storage.
 */
export class HistoryModule extends BaseModule<any, ChatEvent> {
  public interests: ChatEvent[] = [ChatEvent.MESSAGE_UPDATED];

  private get _state(): ChatState {
    return this.store.state;
  }

  public override onNotify(event: ChatEvent, id?: string | number, payload?: any): void {
    if (event === ChatEvent.MESSAGE_UPDATED && typeof id === 'number') {
      const item = this._state.history[id];
      if (item && typeof payload === 'string') {
        // Accumulate text in history state (for React sync)
        if (item.parts && item.parts[0]) {
          item.parts[0].content += payload;
        } else {
          item.content = (item.content || "") + payload;
        }
      }
    }
  }

  public appendMessages(messages: ChatMessage[]): void {
    this._state.history = [...this._state.history, ...messages];
    this.store.emit(ChatEvent.HISTORY_CHANGED);
  }

  public updateMessageMetadata(index: number, metadata: any): void {
    const item = this._state.history[index];
    if (item) {
      item.metadata = { ...item.metadata, ...metadata };
      // Notify both as a general change and specifically for this index
      this.store.emit(ChatEvent.HISTORY_CHANGED, index);
    }
  }

  public setHistory(history: ChatMessage[]): void {
    this._state.history = history;
    this.store.emit(ChatEvent.HISTORY_CHANGED);
  }

  public clear(): void {
    this._state.history = [];
    this.store.emit(ChatEvent.HISTORY_CHANGED);
  }

  public getCount(): number {
    return this._state.history.length;
  }
}
