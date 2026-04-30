import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useChatStore } from "../store/ChatContext";
import { ChatEvent } from "../store/types";
import {
  ChatMessage,
  ISubContentHandle,
  IVirtualChatRowHandle,
} from "../types";
import { AIPrefix, AIPrefixHandle } from "./AIPrefix";
import { ChevronIcon, UserEditIcon } from "./Icons";
import { PartSlot } from "./PartSlot";

export const ChatRow = memo(
  forwardRef<
    IVirtualChatRowHandle<ChatMessage>,
    {
      className?: string;
      item?: ChatMessage | null;
      codeHighlighting?: boolean;
    }
  >(({ className, item: initialItem, codeHighlighting }, ref) => {
    // Core Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const prefixRef = useRef<AIPrefixHandle>(null);
    const editRef = useRef<HTMLDivElement>(null);
    const partRefs = useRef<(ISubContentHandle | null)[]>([]);
    const currentItemRef = useRef<ChatMessage | null>(initialItem || null);

    // State
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLong, setIsLong] = useState(false);
    const [slotCount, setSlotCount] = useState(5); // Increased from 2 to 5 for better initial coverage
    const roleRef = useRef<string>("user");

    const checkHeight = useCallback(() => {
      if (bubbleRef.current && roleRef.current === "user") {
        const hasOverflow = bubbleRef.current.scrollHeight > 200;
        setIsLong(hasOverflow);
      }
    }, []);

    const doUpdate = (item: ChatMessage | null) => {
      if (!item || !containerRef.current) return;

      // --- 0. Cleanup Old Registry ---
      const oldIndex = (currentItemRef.current as any)?.index;
      if (typeof oldIndex === "number" && oldIndex >= 0) {
        store.dom.unregisterRow(oldIndex);
        partRefs.current.forEach((_, i) =>
          store.contentRegistryModule.unregister(oldIndex, i),
        );
        store.componentRegistryModule.unregister(oldIndex, "dots");
      }

      currentItemRef.current = item;

      const role = item.role || "user";
      roleRef.current = role;

      const isLoading = item.metadata?.isLoading === true;
      const minHeight = item.metadata?.minHeight;

      // Update Classes
      containerRef.current.className = `message-row-container ${className || ""} ${role} ${isLoading ? "is-loading" : ""}`;

      if (prefixRef.current) {
        prefixRef.current.setPrefixVisible(role === "assistant");
      }
      if (editRef.current)
        editRef.current.style.display = role === "user" ? "flex" : "none";
      const content = item.content || "";

      if (containerRef.current) {
        containerRef.current.style.minHeight = minHeight
          ? typeof minHeight === "number"
            ? `${minHeight}px`
            : minHeight
          : "0px";
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
            finalParts.push({
              type: "code",
              content: code,
              metadata: { language: lang },
            });
          }
        }
      } else if (content.includes("![")) {
        const imgMatch = content.match(/!\[(.*?)\]\((.*?)\)/);
        if (imgMatch) {
          const preText = content.substring(0, imgMatch.index || 0);
          const postText = content.substring(
            (imgMatch.index || 0) + imgMatch[0].length,
          );
          if (preText.trim())
            finalParts.push({ type: "text", content: preText });
          finalParts.push({ type: "image", content: imgMatch[2] });
          if (postText.trim())
            finalParts.push({ type: "text", content: postText });
        } else {
          finalParts.push({ type: "text", content });
        }
      } else if (item.metadata?.url) {
        finalParts.push({ type: "text", content });
        finalParts.push({
          type: "image",
          content: item.metadata.url,
          metadata: { aspectRatio: item.metadata.aspectRatio },
        });
      } else if (content) {
        finalParts.push({ type: "text", content });
      }

      const hasContent = finalParts.length > 0;
      if (prefixRef.current) {
        prefixRef.current.setDotsVisible(isLoading && !hasContent);
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
          store.dom.registerRow(index, containerRef.current, ref as any);
        }

        // Level 2: Register Content Slots (TextNodes)
        partRefs.current.forEach((slot, i) => {
          const el = (slot as any)?.getTextElement?.();
          if (el) {
            store.contentRegistryModule.register(index, i, el);
          }
        });

        // Level 3: Register UI Components
        const dotsEl = prefixRef.current?.getDotsElement();
        if (dotsEl) {
          store.componentRegistryModule.register(index, "dots", dotsEl);
        }

        // FORCE MEASUREMENT: ResizeObserver ignores changes if a recycled slot happens to have the same height.
        // CRITICAL: Force measurement after update to ensure engine has correct height even if ResizeObserver misses it
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const currentIdx = (currentItemRef.current as any)?.index ?? -1;
            if (currentIdx === index) {
              const h = containerRef.current.offsetHeight;
              store.emit(ChatEvent.ITEM_HEIGHT_CHANGED, undefined, {
                index,
                height: h,
              });
            }
          }
        });
      }
    };

    useImperativeHandle(ref, () => ({
      doUpdate,
      update: (item, index) => {
        if (item && typeof index === "number") {
          doUpdate({ ...item, index } as any);
        } else if (item) {
          doUpdate(item as any);
        }
      },
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
      bubble: bubbleRef.current,
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
        if (typeof index === "number") {
          store.dom.unregisterRow(index);
          // Cleanup contents
          partRefs.current.forEach((_, i) => {
            store.contentRegistryModule.unregister(index, i);
          });
        }
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`message-row-container ${className || ""}`}
      >
        <AIPrefix ref={prefixRef} />

        <div className="message-bubble-wrapper">
          <div
            className="message-bubble-content-row"
            style={{ position: "relative" }}
          >
            <div ref={editRef} style={{ display: "none" }}>
              <UserEditIcon />
            </div>
            <div
              ref={bubbleRef}
              className={`universal-chat-row ${isExpanded ? "expanded" : ""} ${isLong ? "is-long" : ""}`}
            >
              {Array.from({ length: slotCount }).map((_, i) => (
                <PartSlot
                  key={i}
                  ref={(el) => (partRefs.current[i] = el)}
                  codeHighlighting={codeHighlighting}
                />
              ))}
            </div>

            {isLong && (
              <button
                className={`user-expand-btn ${isExpanded ? "expanded" : ""}`}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <ChevronIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }),
);

ChatRow.displayName = "ChatRow";
