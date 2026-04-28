import React, { useRef, useState } from "react";

export interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export const ChatInput = React.memo(({ onSend, placeholder = "Ask Gemini", className = "" }: ChatInputProps) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className={`chat-input-container ${className}`}>
      <div className="chat-input-wrapper floating">
        <div className="input-top">
          <textarea
            ref={textareaRef}
            className="chat-input-field"
            placeholder={placeholder}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>
        <div className="input-bottom">
          <div className="input-left-actions">
            <button className="action-icon-btn">
              <span style={{ fontSize: "20px" }}>+</span>
            </button>
            <button className="action-icon-btn">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              Tools
            </button>
          </div>
          <div className="input-right-actions">
            <div className="fast-selector">
              Fast
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <button className="action-icon-btn" style={{ padding: "4px" }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="footer-disclaimer">
        Gemini is AI and can make mistakes.
      </div>
    </div>
  );
});

ChatInput.displayName = "ChatInput";
