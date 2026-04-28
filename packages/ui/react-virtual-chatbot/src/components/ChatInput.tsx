import React, { useRef } from "react";

export interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export const ChatInput = React.memo(({ onSend, placeholder = "Ask Gemini", className = "" }: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const textarea = textareaRef.current;
    if (textarea && textarea.value.trim()) {
      onSend(textarea.value);
      textarea.value = "";
      textarea.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`chat-input-wrapper-gemini ${className}`}>
      <div className="chat-input-main-card">
        <textarea
          ref={textareaRef}
          className="chat-textarea-gemini"
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        
        <div className="chat-input-bottom-row">
          <div className="input-actions-left">
            <button className="gemini-icon-btn" title="Add file">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button className="gemini-tools-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z"/>
              </svg>
              <span>Tools</span>
            </button>
          </div>
          
          <div className="input-actions-right">
            <div className="model-selector">
              <span>Fast</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <button className="gemini-icon-btn mic-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 18v4M8 22h8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <p className="gemini-footer-note">
        Gemini is AI and can make mistakes.
      </p>
    </div>
  );
});

ChatInput.displayName = "ChatInput";
