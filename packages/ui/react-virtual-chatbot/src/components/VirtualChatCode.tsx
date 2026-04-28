import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ISubContentHandle } from "../types";
import hljs from "highlight.js";
import "highlight.js/styles/vs.css"; // Base VS style

export const VirtualChatCode = forwardRef<ISubContentHandle, { className?: string }>(
  ({ className }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const codeRef = useRef<HTMLElement>(null);
    const langRef = useRef<HTMLSpanElement>(null);

    useImperativeHandle(ref, () => ({
      update: (content, metadata) => {
        if (codeRef.current) {
          let highlighted = "";
          let detectedLang = metadata?.language || "";

          try {
            if (detectedLang) {
              // Use specific language if provided
              highlighted = hljs.highlight(content, { language: detectedLang }).value;
            } else {
              // Auto-detect if no language metadata
              const result = hljs.highlightAuto(content);
              highlighted = result.value;
              detectedLang = result.language || "text";
            }
            codeRef.current.innerHTML = highlighted;
            if (langRef.current) {
              langRef.current.textContent = detectedLang;
            }
          } catch (e) {
            codeRef.current.textContent = content;
            if (langRef.current) langRef.current.textContent = "text";
          }
        }
      },
      setVisible: (visible) => setIsVisible(visible),
    }));

    if (!isVisible) return null;

    return (
      <div className={`virtual-chat-code-wrapper ${className || ""}`}>
        <div className="code-header">
          <span className="code-lang" ref={langRef}>javascript</span>
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
