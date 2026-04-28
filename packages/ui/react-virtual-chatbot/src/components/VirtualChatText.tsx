import MarkdownIt from "markdown-it";
import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { ISubContentHandle } from "../types";
import { setTextNode } from "../utils/dom";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

export const VirtualChatText = memo(
  forwardRef<ISubContentHandle, { className?: string }>(({ className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      setVisible: (visible) => {
        if (containerRef.current) {
          containerRef.current.style.display = visible ? "block" : "none";
        }
      },
      update: (content) => {
        if (containerRef.current) {
          // Fast Path: If content is very simple (no markdown symbols), use optimized setTextNode
          // This avoids the overhead of markdown parsing and innerHTML assignment for plain text
          const isSimple = !/[#*\[\]!{}`<>|]/.test(content);
          
          if (isSimple) {
            setTextNode(containerRef.current, content);
          } else {
            // Render rich markdown for complex content
            const html = md.render(content);
            containerRef.current.innerHTML = html;
          }
        }
      },
    }));

    return (
      <div
        ref={containerRef}
        className={`chat-content-text ${className || ""}`}
        style={{ display: "none" }}
      />
    );
  }),
);

VirtualChatText.displayName = "VirtualChatText";
