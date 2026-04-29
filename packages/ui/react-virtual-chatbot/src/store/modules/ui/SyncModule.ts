import { BaseModule } from '../../core/BaseModule';
import { ChatEvent } from '../../types';
import { setTextNode } from '../../../utils/dom';

/**
 * Orchestrates direct DOM updates for streaming text.
 * Listens for updates from the StreamModule and pushes them to the Registry.
 */
export class SyncModule extends BaseModule<any, ChatEvent> {
  public interests: ChatEvent[] = [ChatEvent.MESSAGE_UPDATED];

  /**
   * React to message updates by finding the DOM element and updating its text.
   */
  public override onNotify(event: ChatEvent, id?: string | number, payload?: any): void {
    if (event === ChatEvent.MESSAGE_UPDATED && typeof id === 'number') {
      const el = this.store.registryModule.getElement(id);
      if (el) {
        // Get the accumulated content from history
        const item = this.store.state.history[id];
        if (item) {
            const fullContent = (item.parts && item.parts[0]) 
                ? item.parts[0].content 
                : (item.content || "");
            
            // Direct DOM update - No React Render!
            setTextNode(el, fullContent);
        }
      }
    }
  }
}
