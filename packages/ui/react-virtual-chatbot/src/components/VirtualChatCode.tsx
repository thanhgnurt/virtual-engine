import { forwardRef, useImperativeHandle, useRef } from "react";
import { ISubContentHandle } from "../types";
import hljs from "highlight.js";
import "highlight.js/styles/vs.css"; // Base VS style
import { setTextNode } from "../utils/dom";

export const VirtualChatCode = forwardRef<ISubContentHandle, { className?: string }>(
  ({ className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLElement>(null);
    const langRef = useRef<HTMLSpanElement>(null);

    useImperativeHandle(ref, () => ({
      update: (content, metadata) => {
        if (codeRef.current) {
          let highlighted = "";
          let detectedLang = metadata?.language || "";

          try {
            if (detectedLang) {
              highlighted = hljs.highlight(content, { language: detectedLang }).value;
            } else {
              const result = hljs.highlightAuto(content);
              highlighted = result.value;
              detectedLang = result.language || "text";
            }
            codeRef.current.innerHTML = highlighted;
            if (langRef.current) {
              langRef.current.textContent = detectedLang;
            }
            } catch (e) {
            setTextNode(codeRef.current, content);
            if (langRef.current) langRef.current.textContent = "text";
          }
        }
      },
      setVisible: (visible) => {
        if (containerRef.current) {
          containerRef.current.style.display = visible ? "block" : "none";
        }
      },
    }));

    return (
      <div 
        ref={containerRef}
        className={`virtual-chat-code-wrapper ${className || ""}`}
        style={{ display: "none" }}
      >
        <div className="code-header">
          <span className="code-lang" ref={langRef}>text</span>
          <div className="code-actions">
            <button className="code-action-btn" title="Copy code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </div>
        <pre className="code-pre">
          <code className="code-content hljs" ref={codeRef} />
        </pre>
      </div>
    );
  },
);

VirtualChatCode.displayName = "VirtualChatCode";
