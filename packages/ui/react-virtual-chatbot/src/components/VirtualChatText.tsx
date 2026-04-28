import MarkdownIt from "markdown-it";
import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { ISubContentHandle } from "../types";

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
          // Render rich markdown like ChatGPT/Gemini
          const html = md.render(content);
          containerRef.current.innerHTML = html;
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
