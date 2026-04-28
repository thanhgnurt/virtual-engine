import React, { useImperativeHandle, useRef, forwardRef, useState, useEffect } from "react";

export interface ModelOption {
  id: string;
  name: string;
  icon: string;
}

export interface ChatInputProps {
  onSend: (text: string) => void;
  onFileSelect?: (file: File) => void;
  onRemoveFile?: () => void;
  selectedFileUrl?: string | null;
  availableModels?: ModelOption[];
  onModelSelect?: (model: ModelOption) => void;
  selectedModelId?: string;
  placeholder?: string;
  className?: string;
}

export interface ChatInputHandle {
  setStreaming: (streaming: boolean) => void;
}

export const ChatInput = React.memo(
  forwardRef<ChatInputHandle, ChatInputProps>(
    ({ 
      onSend, 
      onFileSelect, 
      onRemoveFile, 
      selectedFileUrl, 
      availableModels = [], 
      onModelSelect,
      selectedModelId,
      placeholder = "Ask Gemini", 
      className = "" 
    }, ref) => {
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const containerRef = useRef<HTMLDivElement>(null);
      const fileInputRef = useRef<HTMLInputElement>(null);
      const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
      const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

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

      useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsAttachMenuOpen(false);
            setIsModelMenuOpen(false);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }, []);

      const handleSend = () => {
        const textarea = textareaRef.current;
        if (textarea && (textarea.value.trim() || selectedFileUrl)) {
          onSend(textarea.value);
          textarea.value = "";
          textarea.style.height = "auto";
        }
      };

      const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        // Loại bỏ việc set height inline để tuân theo CSS max-height và auto-height của browser
        
        if (containerRef.current) {
          if (textarea.value.trim().length > 0) {
            containerRef.current.classList.add("has-content");
          } else {
            containerRef.current.classList.remove("has-content");
          }
        }
      };

      const selectedModelName = availableModels.find(m => m.id === selectedModelId)?.name || "Gemini";

      return (
        <div ref={containerRef} className={`chat-input-wrapper-gemini ${className}`}>
          <div className="chat-input-main-card">
            {selectedFileUrl && (
              <div className="inner-file-preview">
                <div className="preview-img-container">
                  <img src={selectedFileUrl} alt="selected" />
                  <button className="remove-preview-btn" onClick={onRemoveFile}>&times;</button>
                </div>
              </div>
            )}
            
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
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onFileSelect) onFileSelect(file);
                    e.target.value = "";
                    setIsAttachMenuOpen(false);
                  }}
                />
                <div className="attach-button-container">
                  <button 
                    className={`icon-btn-circle-action ${isAttachMenuOpen ? 'active' : ''}`} 
                    title="Add file"
                    onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </button>

                  {isAttachMenuOpen && (
                    <div className="attach-floating-menu">
                      <div className="menu-item" onClick={() => fileInputRef.current?.click()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        <span>Upload files</span>
                      </div>
                      <div className="menu-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M12 7l0 2" /><path d="M12 15l0 2" /><path d="M17 12l2 0" /><path d="M5 12l2 0" />
                        </svg>
                        <span>Add from Drive</span>
                      </div>
                      <div className="menu-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M15 8h.01M7 16l4-4 4 4 3-3" /><rect x="3" y="3" width="18" height="18" rx="3" />
                        </svg>
                        <span>Photos</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="tools-pill-new">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a73e8">
                     <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                   </svg>
                   <span>Tools</span>
                </div>
              </div>
              <div className="right-actions">
                <div className="model-dropdown-container">
                  <div className="model-selector-new" onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}>
                    <span>{selectedModelName}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5H7z"/>
                    </svg>
                  </div>
                  
                  {isModelMenuOpen && (
                    <div className="model-floating-menu">
                      <div className="menu-scroll-area">
                        {availableModels.map(model => (
                          <div 
                            key={model.id} 
                            className={`menu-item ${selectedModelId === model.id ? 'active' : ''}`}
                            onClick={() => {
                              if (onModelSelect) onModelSelect(model);
                              setIsModelMenuOpen(false);
                            }}
                          >
                            <span className="item-icon">{model.icon}</span>
                            <span className="item-name">{model.name}</span>
                            {selectedModelId === model.id && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="check-mark">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button className="send-action-btn-new" onClick={handleSend}>
                  <div className="icon-slot">
                    <svg className="mic-mic-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
