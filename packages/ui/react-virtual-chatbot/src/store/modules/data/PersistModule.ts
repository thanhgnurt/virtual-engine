import { BaseModule } from '../../core/BaseModule';
import { ChatEvent, ChatState } from '../../types';

const STORAGE_KEY = 'react-virtual-chatbot-settings';

/**
 * Handles persistent storage of chatbot settings (e.g., API Key, Selected Model).
 * Inspired by the high-performance storage patterns in MiniPriceBoard.
 */
export class PersistModule extends BaseModule<any, ChatEvent> {
  public interests: ChatEvent[] = [ChatEvent.CONFIG_CHANGED];

  public override onInit(): void {
    this.load();
  }

  public override onNotify(event: ChatEvent): void {
    if (event === ChatEvent.CONFIG_CHANGED) {
      this.save();
    }
  }

  /**
   * Load settings from localStorage
   */
  public load(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Safely merge with current state
        if (parsed.apiKey) this.store.state.apiKey = parsed.apiKey;
        if (parsed.selectedModelId) this.store.state.selectedModelId = parsed.selectedModelId;
        
        console.log("Chatbot Persist: Settings loaded", parsed);
      }
    } catch (e) {
      console.warn("Chatbot Persist: Failed to load settings", e);
    }
  }

  /**
   * Save settings to localStorage
   */
  public save(): void {
    try {
      const data = {
        apiKey: this.store.state.apiKey,
        selectedModelId: this.store.state.selectedModelId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log("Chatbot Persist: Settings saved", data);
    } catch (e) {
      console.warn("Chatbot Persist: Failed to save settings", e);
    }
  }
}
