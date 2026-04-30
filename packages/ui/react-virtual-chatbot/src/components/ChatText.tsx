import MarkdownIt from "markdown-it";
import { forwardRef, memo, useImperativeHandle, useRef, useEffect } from "react";
import { ISubContentHandle } from "../types";
import { setTextNode, getTextNode } from "../utils/dom";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

export const ChatText = memo(
  forwardRef<ISubContentHandle, { className?: string }>(({ className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<string>("");
    const lastRenderedContentRef = useRef<string>("");

    const forceRender = () => {
      if (!containerRef.current || contentRef.current === lastRenderedContentRef.current) return;
      
      const content = contentRef.current;
      const isSimple = !/[#*\[\]!{}`<>|]/.test(content);
      
      if (isSimple) {
        setTextNode(containerRef.current, content);
      } else {
        containerRef.current.innerHTML = md.render(content);
      }
      lastRenderedContentRef.current = content;
    };

    useEffect(() => {
      const handleMouseUp = () => {
        // When user releases mouse, they might have finished selecting.
        // Force a render if we have pending content.
        forceRender();
      };
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    useImperativeHandle(ref, () => ({
      container: containerRef.current,
      setVisible: (visible) => {
        if (containerRef.current) {
          containerRef.current.style.display = visible ? "block" : "none";
        }
      },
      update: (content) => {
        if (!containerRef.current) return;
        if (contentRef.current === content) return;

        contentRef.current = content;
        
        // Fast Path: Simple text updates via nodeValue usually don't break selection
        const isSimple = !/[#*\[\]!{}`<>|]/.test(content);
        
        if (isSimple) {
          setTextNode(containerRef.current, content);
          lastRenderedContentRef.current = content;
          return;
        }

        // Rich Path: Only skip if user is actively selecting
        const selection = window.getSelection();
        if (selection && selection.type === 'Range') {
          if (containerRef.current.contains(selection.anchorNode) || containerRef.current.contains(selection.focusNode)) {
            // User is selecting, defer. It will be rendered on next update or mouseup.
            return;
          }
        }

        // Render rich markdown
        containerRef.current.innerHTML = md.render(content);
        lastRenderedContentRef.current = content;
      },
      getContainer: () => {
        return containerRef.current;
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

ChatText.displayName = "ChatText";
