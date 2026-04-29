import { forwardRef, memo, useImperativeHandle, useRef, useLayoutEffect, useState, useCallback } from "react";
import {
  ChatMessage,
  ISubContentHandle,
  IVirtualChatRowHandle,
} from "../types";
import { VirtualChatCode } from "./VirtualChatCode";
import { VirtualChatImage } from "./VirtualChatImage";
import { VirtualChatText } from "./VirtualChatText";
import { GeminiSparkle } from "./GeminiSparkle";

const UserEditIcon = () => (
  <div className="user-edit-icon">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  </div>
);

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const UniversalChatRow = memo(
  forwardRef<IVirtualChatRowHandle<ChatMessage>, { className?: string; item?: ChatMessage | null }>(
    ({ className, item: initialItem }, ref) => {
      const textRef = useRef<ISubContentHandle>(null);
      const codeRef = useRef<ISubContentHandle>(null);
      const imageRef = useRef<ISubContentHandle>(null);
      const sparkRef = useRef<HTMLDivElement>(null);
      const dotsRef = useRef<HTMLDivElement>(null);
      const editRef = useRef<HTMLDivElement>(null);
      const containerRef = useRef<HTMLDivElement>(null);
      const bubbleRef = useRef<HTMLDivElement>(null);
      const [isExpanded, setIsExpanded] = useState(false);
      const [isLong, setIsLong] = useState(false);
      const roleRef = useRef<string>("user");

      const checkHeight = useCallback(() => {
        if (bubbleRef.current && roleRef.current === 'user') {
          const hasOverflow = bubbleRef.current.scrollHeight > 200;
          setIsLong(hasOverflow);
        }
      }, []);

      const doUpdate = (item: ChatMessage | null) => {
        if (!item || !containerRef.current) return;
        
        const role = item.role || "user";
        roleRef.current = role;
        const rowElement = containerRef.current;
        rowElement.classList.remove("user", "assistant");
        rowElement.classList.add(role);
        
        // Reset expansion when item changes
        setIsExpanded(false);
        setIsLong(false);

        const isLoading = item.metadata?.isLoading === true;
        const hasContent = !!(item.content || (item.parts && item.parts.length > 0));

        if (sparkRef.current) {
          sparkRef.current.style.display = role === "assistant" ? "flex" : "none";
          const sparkleCont = sparkRef.current.querySelector('.gemini-sparkle');
          if (sparkleCont) {
            if (isLoading) sparkleCont.classList.add('is-loading');
            else sparkleCont.classList.remove('is-loading');
          }
        }

        if (dotsRef.current) {
          dotsRef.current.style.display = (isLoading && !hasContent) ? "flex" : "none";
        }
        
        if (editRef.current) {
          editRef.current.style.display = item.role === "user" ? "flex" : "none";
        }

        if (item.metadata?.minHeight) {
          rowElement.style.minHeight = item.metadata.minHeight;
        } else {
          rowElement.style.minHeight = "";
        }

        // Reset visibility
        textRef.current?.setVisible(false);
        codeRef.current?.setVisible(false);
        imageRef.current?.setVisible(false);

        const content = item.content || "";

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
        } else if (content.includes("```")) {
          const parts = content.split("```");
          const preText = parts[0];
          const codeSegment = parts[1] || "";
          
          if (preText.trim()) {
            textRef.current?.setVisible(true);
            textRef.current?.update(preText);
          }
          
          if (codeSegment) {
            let lang = "";
            let code = codeSegment;
            const firstNewline = codeSegment.indexOf("\n");
            if (firstNewline !== -1 && firstNewline < 20) {
              lang = codeSegment.substring(0, firstNewline).trim();
              code = codeSegment.substring(firstNewline + 1);
            }
            codeRef.current?.setVisible(true);
            codeRef.current?.update(code, { language: lang });
          }
        } else if (content.includes("![")) {
          // Detect markdown image ![alt](url)
          const imgMatch = content.match(/!\[(.*?)\]\((.*?)\)/);
          if (imgMatch) {
            const preText = content.substring(0, imgMatch.index || 0);
            const postText = content.substring((imgMatch.index || 0) + imgMatch[0].length);
            const imageUrl = imgMatch[2];

            if (preText.trim()) {
              textRef.current?.setVisible(true);
              textRef.current?.update(preText);
            }

            imageRef.current?.setVisible(true);
            imageRef.current?.update(imageUrl);

            if (postText.trim()) {
              textRef.current?.update((preText + "\n\n" + postText).trim());
            }
          } else {
            textRef.current?.setVisible(true);
            textRef.current?.update(content);
          }
        } else if (content) {
          const type = item.type || "text";
          const targetRef = type === "text" ? textRef : type === "code" ? codeRef : imageRef;
          targetRef.current?.setVisible(true);
          targetRef.current?.update(content, item.metadata);
        }

        // Delay check to allow content to render
        requestAnimationFrame(checkHeight);
      };

      useImperativeHandle(ref, () => ({
        update: (item, _index, _rowElement, _isVisible) => doUpdate(item),
        updateText: (text) => {
          if (!containerRef.current) return;
          if (dotsRef.current) dotsRef.current.style.display = "none";
          
          const parts = text.split("```");
          if (parts.length === 1) {
            textRef.current?.setVisible(true);
            textRef.current?.update(text);
            codeRef.current?.setVisible(false);
          } else {
            const preText = parts[0];
            const codeSegment = parts[1] || "";
            if (preText.trim()) {
              textRef.current?.setVisible(true);
              textRef.current?.update(preText);
            }
            let lang = "";
            let code = codeSegment;
            const firstNewline = codeSegment.indexOf("\n");
            if (firstNewline !== -1 && firstNewline < 20) {
              lang = codeSegment.substring(0, firstNewline).trim();
              code = codeSegment.substring(firstNewline + 1);
            }
            codeRef.current?.setVisible(true);
            codeRef.current?.update(code, { language: lang });
          }
          requestAnimationFrame(checkHeight);
        },
      }));

      useLayoutEffect(() => {
        if (initialItem) doUpdate(initialItem);
      }, []);

      return (
        <div ref={containerRef} className={`message-row-container ${className || ""}`}>
          <div 
            ref={sparkRef} 
            className="ai-message-prefix" 
            style={{ display: initialItem?.role === "assistant" ? "flex" : "none" }}
          >
            <GeminiSparkle isLoading={initialItem?.metadata?.isLoading} />
            <div ref={dotsRef} className="gemini-typing-dots" style={{ display: "none" }}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div className="message-bubble-wrapper">
            <div className="message-bubble-content-row" style={{ position: 'relative' }}>
              <div ref={editRef} style={{ display: "none" }}>
                <UserEditIcon />
              </div>
              <div 
                ref={bubbleRef}
                className={`universal-chat-row ${isExpanded ? 'expanded' : ''} ${isLong ? 'is-long' : ''}`}
              >
                <VirtualChatText ref={textRef} className="chat-content-text" />
                <VirtualChatCode ref={codeRef} className="chat-content-code" />
                <VirtualChatImage ref={imageRef} className="chat-content-image" />
              </div>

              {isLong && (
                <button 
                  className={`user-expand-btn ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? "Collapse" : "Expand text"}
                >
                  <ChevronIcon />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    },
  ),
);

UniversalChatRow.displayName = "UniversalChatRow";
