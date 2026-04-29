import { ChatMessage } from "../types";

/**
 * All events that can happen in the ChatStore.
 * Unified for both Modules and UI components.
 */
export enum ChatEvent {
  // Data events
  HISTORY_CHANGED = 'HISTORY_CHANGED',
  CONFIG_CHANGED = 'CONFIG_CHANGED',
  
  // UI / Sync events
  MESSAGE_UPDATED = 'MESSAGE_UPDATED', // Streaming update
  STREAM_STATE_CHANGED = 'STREAM_STATE_CHANGED',
  LAYOUT_UPDATED = 'LAYOUT_UPDATED',
  
  // Internal module events
  INTERNAL_SCROLL_TO_BOTTOM = 'INTERNAL_SCROLL_TO_BOTTOM',
}

/**
 * The core state of the ChatStore.
 */
export interface ChatState {
  history: ChatMessage[];
  isStreaming: boolean;
  selectedModelId: string;
  apiKey: string;
  pendingFile: {
    file: File;
    preview: string;
  } | null;
}
