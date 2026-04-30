import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface ModelOption {
  id: string;
  name: string;
  icon: string;
}

export interface ChatInputProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  onFileSelect?: (file: File) => void;
  onRemoveFile?: () => void;
  selectedFileUrl?: string | null;
  availableModels?: ModelOption[];
  onModelSelect?: (model: ModelOption) => void;
  selectedModelId?: string;
  placeholder?: string;
  className?: string;
  isStreaming?: boolean;
}

export interface ChatInputHandle {
  setStreaming: (streaming: boolean) => void;
}

export const ChatInput = React.memo(
  forwardRef<ChatInputHandle, ChatInputProps>(
    (
      {
        onSend,
        onStop,
        onFileSelect,
        onRemoveFile,
        selectedFileUrl,
        availableModels = [],
        onModelSelect,
        selectedModelId,
        placeholder = "Ask Gemini",
        className = "",
        isStreaming: isStreamingProp,
      },
      ref,
    ) => {
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const containerRef = useRef<HTMLDivElement>(null);
      const fileInputRef = useRef<HTMLInputElement>(null);
      const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
      const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
      const [isStreaming, setIsStreaming] = useState(false);

      useEffect(() => {
        if (isStreamingProp !== undefined) {
          setIsStreaming(isStreamingProp);
          const textarea = textareaRef.current;
          if (textarea) textarea.disabled = isStreamingProp;
        }
      }, [isStreamingProp]);
      const [isExpanded, setIsExpanded] = useState(false);

      useImperativeHandle(ref, () => ({
        setStreaming: (streaming: boolean) => {
          setIsStreaming(streaming);
          if (streaming) {
            setIsExpanded(false); // Close expansion when streaming starts
          }
          const textarea = textareaRef.current;
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
          if (
            containerRef.current &&
            !containerRef.current.contains(event.target as Node)
          ) {
            setIsAttachMenuOpen(false);
            setIsModelMenuOpen(false);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
          document.removeEventListener("mousedown", handleClickOutside);
      }, []);

      const handleSend = () => {
        const textarea = textareaRef.current;
        if (textarea && (textarea.value.trim() || selectedFileUrl)) {
          onSend(textarea.value);
          textarea.value = "";
          textarea.style.height = "auto";
          setIsExpanded(false);
        }
      };

      const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;

        // Auto-expand height (only if not in fixed expansion mode)
        if (!isExpanded) {
          const scrollHeight = textarea.scrollHeight;

          if (scrollHeight <= 24) {
            textarea.style.height = "24px";
          } else {
            const nextHeight = Math.min(scrollHeight, 200);
            textarea.style.height = nextHeight + "px";
          }
        } else {
          textarea.style.height = "100%"; // Fill the expanded card
        }

        if (containerRef.current) {
          if (textarea.value.trim().length > 0) {
            containerRef.current.classList.add("has-content");
          } else {
            containerRef.current.classList.remove("has-content");
          }
        }
      };

      const selectedModelName =
        availableModels.find((m) => m.id === selectedModelId)?.name || "Gemini";

      return (
        <div
          ref={containerRef}
          className={`chat-input-wrapper-gemini ${isExpanded ? "is-expanded" : ""} ${isStreaming ? "is-streaming" : ""} ${className}`}
        >
          <div
            className={`chat-input-main-card ${isExpanded ? "is-expanded" : ""}`}
          >
            {selectedFileUrl && (
              <div className="inner-file-preview">
                <div className="preview-img-container">
                  <img src={selectedFileUrl} alt="selected" />
                  <button className="remove-preview-btn" onClick={onRemoveFile}>
                    &times;
                  </button>
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
              <button
                className={`expand-toggle-btn ${isExpanded ? "active" : ""}`}
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Expand"}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  {isExpanded ? (
                    <path d="M4 14l6-6M4 14h5M10 8v5M20 10l-6 6M20 10h-5M14 16v-5" />
                  ) : (
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  )}
                </svg>
              </button>
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
                    className={`icon-btn-circle-action ${isAttachMenuOpen ? "active" : ""}`}
                    title="Add file"
                    onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </button>

                  {isAttachMenuOpen && (
                    <div className="attach-floating-menu">
                      <div
                        className="menu-item"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        <span>Upload files</span>
                      </div>
                      <div className="menu-item">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                          <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                          <path d="M12 7l0 2" />
                          <path d="M12 15l0 2" />
                          <path d="M17 12l2 0" />
                          <path d="M5 12l2 0" />
                        </svg>
                        <span>Add from Drive</span>
                      </div>
                      <div className="menu-item">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M15 8h.01M7 16l4-4 4 4 3-3" />
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                        </svg>
                        <span>Photos</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="tools-pill-new">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#1a73e8"
                  >
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                  </svg>
                  <span>Tools</span>
                </div>
              </div>
              <div className="right-actions">
                <div className="model-dropdown-container">
                  <div
                    className="model-selector-new"
                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                  >
                    <span>{selectedModelName}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M7 10l5 5 5-5H7z" />
                    </svg>
                  </div>

                  {isModelMenuOpen && (
                    <div className="model-floating-menu">
                      <div className="menu-scroll-area">
                        {availableModels.map((model) => (
                          <div
                            key={model.id}
                            className={`menu-item ${selectedModelId === model.id ? "active" : ""}`}
                            onClick={() => {
                              if (onModelSelect) onModelSelect(model);
                              setIsModelMenuOpen(false);
                            }}
                          >
                            <span className="item-icon">{model.icon}</span>
                            <span className="item-name">{model.name}</span>
                            {selectedModelId === model.id && (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="check-mark"
                              >
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="send-action-btn-new"
                  onClick={() => {
                    if (isStreaming) {
                      if (onStop) onStop();
                    } else {
                      handleSend();
                    }
                  }}
                >
                  <div className="icon-slot">
                    <svg
                      className="mic-mic-icon"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path
                        d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <svg
                      className="send-icon"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <svg
                      className="pause-icon"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div className="footer-disclaimer">
            Gemini is AI and can make mistakes.
          </div>
        </div>
      );
    },
  ),
);

ChatInput.displayName = "ChatInput";
