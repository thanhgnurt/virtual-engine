import React from "react";

export interface ISubContentHandle {
  update: (data: any, metadata?: any) => void;
  setVisible: (visible: boolean) => void;
}

/**
 * Common interface for chatbot messages
 */
export interface ChatPart {
  type: "text" | "code" | "image" | "error";
  content: string;
  metadata?: any;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  /** Optional for legacy single-type messages */
  type?: "text" | "code" | "image" | "error";
  /** Optional for legacy single-type messages */
  content?: string;
  /** New: support for multiple parts in one message row */
  parts?: ChatPart[];
  metadata?: {
    language?: string;
    url?: string;
    [key: string]: any;
  };
}

/**
 * Handle used by the engine to imperatively update a visible message slot.
 */
export interface IVirtualChatRowHandle<T = any> {
  update: (
    item: T | null,
    index: number,
    rowElement: HTMLDivElement | null,
    isVisible: boolean,
  ) => void;
  /** Specialized for text updates during streaming */
  updateText: (text: string) => void;
}

export interface ReactVirtualChatbotProps<T> {
  /** The list of messages to display */
  items: ArrayLike<T>;
  /** Initial estimated height of each message (Optional, defaults to 100) */
  itemHeight?: number;
  /** Height of the scroll container */
  height?: number;
  /** Width of the scroll container */
  width?: string | number;
  /** Number of buffer rows to render outside visible area */
  bufferRow?: number;
  /** Optional class for the container */
  className?: string;
  /** Function to render each message */
  renderItem: (
    item: T | null,
    index: number,
  ) => React.ReactElement<{ ref?: React.Ref<IVirtualChatRowHandle<T>> }>;
  /** Whether to automatically scroll to bottom on new items */
  followOutput?: boolean;
  /** Optional custom component to render as the 'Thinking' indicator */
  renderTypingIndicator?: () => React.ReactNode;
}

export interface ReactVirtualChatbotHandle<T = any> {
  readonly element: HTMLDivElement | null;
  patchMetadata: (index: number, patch: any) => void;
  scrollToBottom: () => void;
  /**
   * Imperatively append messages without triggering a React re-render.
   * @param forceScroll If true, will unconditionally scroll to the bottom.
   */
  appendItems: (newItems: T[], forceScroll?: boolean) => void;
  /**
   * Show/hide a typing indicator ("AI is typing...")
   * @param autoScroll If true, will jump to bottom. Default: true.
   */
  setTyping: (isVisible: boolean, autoScroll?: boolean) => void;
  /**
   * Specialized method to imperatively update a specific message's text node.
   * Extremely fast, bypasses React.
   */
  updateMessageText: (index: number, text: string) => void;
  /**
   * Update the underlying data for an item and refresh its slot if visible.
   */
  updateItem: (index: number, newItem: T) => void;
  /**
   * Scroll smoothly to a specific message index.
   */
  scrollToIndex: (index: number) => void;
  /**
   * Set a temporary bottom buffer to allow the last message to scroll to top.
   */
  setBottomBuffer: (height: number) => void;
  /**
   * Get the true total number of chat items managed internally.
   */
  getTotalCount: () => number;
}
