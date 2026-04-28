import React, { useImperativeHandle, useRef, forwardRef } from "react";

export interface ChatInputProps {
  onSend: (text: string) => void;
  onModelClick?: () => void;
  modelName?: string;
  placeholder?: string;
  className?: string;
}

export interface ChatInputHandle {
  setStreaming: (streaming: boolean) => void;
}

export const ChatInput = React.memo(
  forwardRef<ChatInputHandle, ChatInputProps>(
    ({ onSend, onModelClick, modelName = "Fast", placeholder = "Ask Gemini", className = "" }, ref) => {
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const containerRef = useRef<HTMLDivElement>(null);

      useImperativeHandle(ref, () => ({
        setStreaming: (streaming: boolean) => {
          const container = containerRef.current;
          const textarea = textareaRef.current;
          if (container) {
            if (streaming) {
              container.classList.add("is-streaming");
            } else {
              container.classList.remove("is-streaming");
            }
          }
          if (textarea) {
            textarea.disabled = streaming;
            if (!streaming) {
              setTimeout(() => textarea.focus(), 50);
            }
          }
        },
      }));

      const handleSend = () => {
        const textarea = textareaRef.current;
        if (textarea && textarea.value.trim()) {
          onSend(textarea.value);
          textarea.value = "";
          textarea.style.height = "auto";
        }
      };

      const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
        
        if (containerRef.current) {
          if (textarea.value.trim().length > 0) {
            containerRef.current.classList.add("has-content");
          } else {
            containerRef.current.classList.remove("has-content");
          }
        }
      };

      return (
        <div ref={containerRef} className={`chat-input-wrapper-gemini ${className}`}>
          <div className="chat-input-main-card">
            <div className="input-action-row-top">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={placeholder}
                onInput={handleInput as any}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
            <div className="input-action-row-bottom">
              <div className="left-actions">
                <button className="icon-btn-circle-action" title="Add file">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </button>
                <div className="tools-pill-new">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a73e8">
                     <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                   </svg>
                   <span>Tools</span>
                </div>
              </div>
              <div className="right-actions">
                <div className="model-selector-new" onClick={onModelClick}>
                  <span>{modelName}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5H7z"/>
                  </svg>
                </div>
                <button className="send-action-btn-new" onClick={handleSend}>
                  <div className="icon-slot">
                    <svg className="mic-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round"/>
                    </svg>
                    <svg className="send-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <svg className="pause-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="6" y="4" width="3" height="16" rx="1"/><rect x="15" y="4" width="3" height="16" rx="1"/>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div className="footer-disclaimer">Gemini is AI and can make mistakes.</div>
        </div>
      );
    }
  )
);

ChatInput.displayName = "ChatInput";
