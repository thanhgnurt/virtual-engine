import { forwardRef, memo, useImperativeHandle, useRef } from "react";
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

export const UniversalChatRow = memo(
  forwardRef<IVirtualChatRowHandle<ChatMessage>, { className?: string }>(
    ({ className }, ref) => {
      const textRef = useRef<ISubContentHandle>(null);
      const codeRef = useRef<ISubContentHandle>(null);
      const imageRef = useRef<ISubContentHandle>(null);
      const sparkRef = useRef<HTMLDivElement>(null);

      useImperativeHandle(ref, () => ({
        update: (item, index, rowElement, isVisible) => {
          if (!item || !rowElement) return;

          // 1. IMPERATIVELY update the role class and spark icon
          rowElement.classList.remove("user", "assistant");
          if (item.role) {
            rowElement.classList.add(item.role);
          }
          
          if (sparkRef.current) {
            sparkRef.current.style.display = item.role === "assistant" ? "block" : "none";
          }

          // 2. Reset all slots first
          textRef.current?.setVisible(false);
          codeRef.current?.setVisible(false);
          imageRef.current?.setVisible(false);

          // 3. Handle Multi-part or Legacy content
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
                imageRef.current?.update(part.metadata?.url || part.content);
              }
            });
          } else {
            const type = item.type || "text";
            const targetRef = type === "text" ? textRef : type === "code" ? codeRef : imageRef;
            targetRef.current?.setVisible(true);
            targetRef.current?.update(item.content || "", item.metadata);
          }
        },
        updateText: (text) => {
          textRef.current?.setVisible(true);
          textRef.current?.update(text);
        },
      }));

      return (
        <>
          <div ref={sparkRef} style={{ display: "none" }}>
            <GeminiSparkIcon />
          </div>
          <div className="message-bubble-wrapper">
            <div className={`universal-chat-row ${className || ""}`}>
              <VirtualChatText ref={textRef} className="chat-content-text" />
              <VirtualChatCode ref={codeRef} className="chat-content-code" />
              <VirtualChatImage ref={imageRef} className="chat-content-image" />
            </div>
          </div>
        </>
      );
    },
  ),
);

UniversalChatRow.displayName = "UniversalChatRow";
