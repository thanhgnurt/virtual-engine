import { forwardRef, memo, useImperativeHandle, useRef, useLayoutEffect } from "react";
import {
  ChatMessage,
  ISubContentHandle,
  IVirtualChatRowHandle,
} from "../types";
import { VirtualChatCode } from "./VirtualChatCode";
import { VirtualChatImage } from "./VirtualChatImage";
import { VirtualChatText } from "./VirtualChatText";

const GeminiSparkIcon = () => (
  <div className="gemini-spark-icon">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </svg>
  </div>
);

const UserEditIcon = () => (
  <div className="user-edit-icon">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  </div>
);

export const UniversalChatRow = memo(
  forwardRef<IVirtualChatRowHandle<ChatMessage>, { className?: string; item?: ChatMessage | null }>(
    ({ className, item: initialItem }, ref) => {
      const textRef = useRef<ISubContentHandle>(null);
      const codeRef = useRef<ISubContentHandle>(null);
      const imageRef = useRef<ISubContentHandle>(null);
      const sparkRef = useRef<HTMLDivElement>(null);
      const editRef = useRef<HTMLDivElement>(null);
      const containerRef = useRef<HTMLDivElement>(null);

      const doUpdate = (item: ChatMessage | null) => {
        if (!item || !containerRef.current) return;
        
        const rowElement = containerRef.current;

        rowElement.classList.remove("user", "assistant");
        if (item.role) rowElement.classList.add(item.role);
        
        if (sparkRef.current) {
          sparkRef.current.style.display = item.role === "assistant" ? "block" : "none";
        }
        
        if (editRef.current) {
          editRef.current.style.display = item.role === "user" ? "flex" : "none";
        }

        textRef.current?.setVisible(false);
        codeRef.current?.setVisible(false);
        imageRef.current?.setVisible(false);

        if (item.parts && item.parts.length > 0) {
          item.parts.forEach((part) => {
            if (part.type === "text") {
              textRef.current?.setVisible(true);
              textRef.current?.update(part.content);
            } else if (part.type === "code") {
              codeRef.current?.setVisible(true);
              codeRef.current?.update(part.content, part.metadata);
            } else if (part.type === "image") {
              imageRef.current?.setVisible(true);
              imageRef.current?.update(part.metadata?.url || part.content, part.metadata);
            }
          });
        } else {
          const type = item.type || "text";
          const targetRef = type === "text" ? textRef : type === "code" ? codeRef : imageRef;
          targetRef.current?.setVisible(true);
          targetRef.current?.update(item.content || "", item.metadata);
        }
      };

      useImperativeHandle(ref, () => ({
        update: (item) => doUpdate(item),
        updateText: (text) => {
          textRef.current?.setVisible(true);
          textRef.current?.update(text);
        },
      }));

      useLayoutEffect(() => {
        if (initialItem) doUpdate(initialItem);
      }, []);

      return (
        <div ref={containerRef} className={`message-row-container ${className || ""}`}>
          <div ref={sparkRef} style={{ display: "none" }}>
            <GeminiSparkIcon />
          </div>
          <div className="message-bubble-wrapper">
            <div className="message-bubble-content-row">
              <div ref={editRef} style={{ display: "none" }}>
                <UserEditIcon />
              </div>
              <div className="universal-chat-row">
                <VirtualChatText ref={textRef} className="chat-content-text" />
                <VirtualChatCode ref={codeRef} className="chat-content-code" />
                <VirtualChatImage ref={imageRef} className="chat-content-image" />
              </div>
            </div>
          </div>
        </div>
      );
    },
  ),
);

UniversalChatRow.displayName = "UniversalChatRow";
