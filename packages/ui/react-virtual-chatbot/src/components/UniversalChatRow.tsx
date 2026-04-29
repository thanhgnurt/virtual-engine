import { forwardRef, memo, useImperativeHandle, useRef, useLayoutEffect, useState, useCallback, useEffect } from "react";
import { useChatStore } from "../store/ChatContext";
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

/**
 * A dynamic slot that can render Text, Code, or Image.
 */
const UniversalPartSlot = memo(forwardRef<ISubContentHandle, { className?: string, codeHighlighting?: boolean }>(({ codeHighlighting }, ref) => {
  const textRef = useRef<ISubContentHandle>(null);
  const codeRef = useRef<ISubContentHandle>(null);
  const imageRef = useRef<ISubContentHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    update: (content: string, metadata?: any) => {
      const type = metadata?.type || "text";
      
      // Hide all first
      textRef.current?.setVisible(false);
      codeRef.current?.setVisible(false);
      imageRef.current?.setVisible(false);

      if (type === "text") {
        textRef.current?.setVisible(true);
        textRef.current?.update(content);
      } else if (type === "code") {
        codeRef.current?.setVisible(true);
        codeRef.current?.update(content, metadata);
      } else if (type === "image") {
        imageRef.current?.setVisible(true);
        imageRef.current?.update(content, metadata);
      }
    },
    setVisible: (visible: boolean) => {
      if (containerRef.current) {
        containerRef.current.style.display = visible ? "block" : "none";
      }
    },
    getTextElement: () => {
      // Return the DOM element of the VirtualChatText
      return (textRef.current as any)?.container;
    }
  }));

  return (
    <div ref={containerRef} style={{ display: "none" }}>
      <VirtualChatText ref={textRef} className="chat-content-text" />
      <VirtualChatCode ref={codeRef} className="chat-content-code" codeHighlighting={codeHighlighting} />
      <VirtualChatImage ref={imageRef} className="chat-content-image" />
    </div>
  );
}));

export const UniversalChatRow = memo(
  forwardRef<IVirtualChatRowHandle<ChatMessage>, { className?: string; item?: ChatMessage | null; codeHighlighting?: boolean }>(
    ({ className, item: initialItem, codeHighlighting }, ref) => {
      // Core Refs
      const containerRef = useRef<HTMLDivElement>(null);
      const bubbleRef = useRef<HTMLDivElement>(null);
      const sparkRef = useRef<HTMLDivElement>(null);
      const dotsRef = useRef<HTMLDivElement>(null);
      const editRef = useRef<HTMLDivElement>(null);
      const partRefs = useRef<(ISubContentHandle | null)[]>([]);
      const currentItemRef = useRef<ChatMessage | null>(initialItem || null);

      // State
      const [isExpanded, setIsExpanded] = useState(false);
      const [isLong, setIsLong] = useState(false);
      const [slotCount, setSlotCount] = useState(5); // Increased from 2 to 5 for better initial coverage
      const roleRef = useRef<string>("user");

      const checkHeight = useCallback(() => {
        if (bubbleRef.current && roleRef.current === 'user') {
          const hasOverflow = bubbleRef.current.scrollHeight > 200;
          setIsLong(hasOverflow);
        }
      }, []);

      const doUpdate = (item: ChatMessage | null) => {
        if (!item || !containerRef.current) return;
        
        // --- 0. Cleanup Old Registry ---
        const oldIndex = (currentItemRef.current as any)?.index;
        if (typeof oldIndex === "number" && oldIndex >= 0) {
          store.rowRegistryModule.unregister(oldIndex);
          partRefs.current.forEach((_, i) => store.contentRegistryModule.unregister(oldIndex, i));
          store.componentRegistryModule.unregister(oldIndex, "dots");
        }

        currentItemRef.current = item;
        
        const role = item.role || "user";
        roleRef.current = role;
        
        const isLoading = item.metadata?.isLoading === true;
        const minHeight = item.metadata?.minHeight;
        
        // Update Classes
        containerRef.current.className = `message-row-container ${className || ""} ${role} ${isLoading ? 'is-loading' : ''}`;
        
        if (sparkRef.current) {
          sparkRef.current.style.display = role === "assistant" ? "flex" : "none";
        }
        if (editRef.current) editRef.current.style.display = role === "user" ? "flex" : "none";
        const content = item.content || "";

        if (containerRef.current) {
           containerRef.current.style.minHeight = minHeight ? (typeof minHeight === 'number' ? `${minHeight}px` : minHeight) : "0px";
        }
        
        // --- 1. Content Parsing ---
        const finalParts: any[] = [];
        if (item.parts && item.parts.length > 0) {
          finalParts.push(...item.parts);
        } else if (content.includes("```")) {
          const rawParts = content.split("```");
          for (let i = 0; i < rawParts.length; i++) {
            if (i % 2 === 0) {
              if (rawParts[i].trim() || rawParts.length === 1) {
                 finalParts.push({ type: "text", content: rawParts[i] });
              }
            } else {
              let lang = "";
              let code = rawParts[i];
              const firstNewline = rawParts[i].indexOf("\n");
              if (firstNewline !== -1 && firstNewline < 20) {
                lang = rawParts[i].substring(0, firstNewline).trim();
                code = rawParts[i].substring(firstNewline + 1);
              }
              finalParts.push({ type: "code", content: code, metadata: { language: lang } });
            }
          }
        } else if (content.includes("![")) {
          const imgMatch = content.match(/!\[(.*?)\]\((.*?)\)/);
          if (imgMatch) {
            const preText = content.substring(0, imgMatch.index || 0);
            const postText = content.substring((imgMatch.index || 0) + imgMatch[0].length);
            if (preText.trim()) finalParts.push({ type: "text", content: preText });
            finalParts.push({ type: "image", content: imgMatch[2] });
            if (postText.trim()) finalParts.push({ type: "text", content: postText });
          } else {
            finalParts.push({ type: "text", content });
          }
        } else if (content) {
          finalParts.push({ type: "text", content });
        }

        const hasContent = finalParts.length > 0;
        if (dotsRef.current) {
          dotsRef.current.style.display = (isLoading && !hasContent) ? "flex" : "none";
        }

        // --- 2. Dynamic Slot Management ---
        if (finalParts.length > slotCount) {
          setSlotCount(finalParts.length);
          return; // Wait for re-render
        }

        // --- 3. Rendering ---
        for (let i = 0; i < slotCount; i++) {
          partRefs.current[i]?.setVisible(false);
        }

        finalParts.forEach((part, i) => {
          const slot = partRefs.current[i];
          if (slot) {
            slot.setVisible(true);
            slot.update(part.content, { ...part.metadata, type: part.type });
          }
        });

        requestAnimationFrame(checkHeight);

        // --- 4. Registry Update ---
        const index = (item as any).index;
        if (typeof index === "number" && index >= 0) {
          // Level 1: Register Row Container
          if (containerRef.current) {
            store.rowRegistryModule.register(index, containerRef.current, ref as any);
          }

          // Level 2: Register Content Slots (TextNodes)
          partRefs.current.forEach((slot, i) => {
            const el = (slot as any)?.getTextElement?.();
            if (el) {
              store.contentRegistryModule.register(index, i, el);
            }
          });

          // Level 3: Register UI Components
          if (dotsRef.current) {
            store.componentRegistryModule.register(index, "dots", dotsRef.current);
          }
        }
      };

      useImperativeHandle(ref, () => ({
        doUpdate,
        update: (item) => doUpdate(item),
        updateText: (text) => {
          if (!text.includes("```") && !text.includes("![") && slotCount === 2) {
             const slot = partRefs.current[0];
             if (slot) {
               slot.setVisible(true);
               slot.update(text, { type: "text" });
             }
             requestAnimationFrame(checkHeight);
          } else {
             doUpdate({ ...currentItemRef.current, content: text } as any);
          }
        },
        container: containerRef.current,
        bubble: bubbleRef.current
      }));

      const store = useChatStore();

      useLayoutEffect(() => {
        if (currentItemRef.current) {
          doUpdate(currentItemRef.current);
        }
      }, [slotCount]);

      useEffect(() => {
        return () => {
          const index = (currentItemRef.current as any)?.index;
          if (typeof index === 'number') {
            store.rowRegistryModule.unregister(index);
            // Cleanup contents
            partRefs.current.forEach((_, i) => {
               store.contentRegistryModule.unregister(index, i);
            });
          }
        };
      }, []);

      return (
        <div ref={containerRef} className={`message-row-container ${className || ""}`}>
          <div ref={sparkRef} className="ai-message-prefix">
            <GeminiSparkle />
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
                {Array.from({ length: slotCount }).map((_, i) => (
                  <UniversalPartSlot key={i} ref={el => partRefs.current[i] = el} codeHighlighting={codeHighlighting} />
                ))}
              </div>

              {isLong && (
                <button 
                  className={`user-expand-btn ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setIsExpanded(!isExpanded)}
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
