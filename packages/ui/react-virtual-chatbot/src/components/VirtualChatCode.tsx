import { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from "react";
import { ISubContentHandle } from "../types";
import hljs from "highlight.js";
import "highlight.js/styles/vs.css"; // Base VS style
import { setTextNode } from "../utils/dom";

const ICON_COPY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>`;
const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>`;

export const VirtualChatCode = forwardRef<ISubContentHandle, { className?: string }>(
  ({ className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLElement>(null);
    const langRef = useRef<HTMLSpanElement>(null);
    const copyBtnRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<string>("");
    const lastRenderedContentRef = useRef<string>("");
    const lastMetadataRef = useRef<any>(null);

    const handleCopy = useCallback(() => {
      if (contentRef.current) {
        navigator.clipboard.writeText(contentRef.current).then(() => {
          if (copyBtnRef.current) {
            copyBtnRef.current.innerHTML = ICON_CHECK;
            setTimeout(() => {
              if (copyBtnRef.current) copyBtnRef.current.innerHTML = ICON_COPY;
            }, 2000);
          }
        });
      }
    }, []);

    const forceRender = useCallback(() => {
      if (!codeRef.current || contentRef.current === lastRenderedContentRef.current) return;
      
      const content = contentRef.current;
      const metadata = lastMetadataRef.current;
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
        if (langRef.current) langRef.current.textContent = detectedLang;
      } catch (e) {
        setTextNode(codeRef.current, content);
        if (langRef.current) langRef.current.textContent = "text";
      }
      lastRenderedContentRef.current = content;
    }, []);

    useEffect(() => {
      const handleMouseUp = () => {
        forceRender();
      };
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [forceRender]);

    useImperativeHandle(ref, () => ({
      update: (content, metadata) => {
        if (contentRef.current === content) return;
        
        contentRef.current = content;
        lastMetadataRef.current = metadata;

        // Prevent update if user is currently selecting text within this code block
        const selection = window.getSelection();
        if (selection && selection.type === 'Range' && codeRef.current) {
          if (codeRef.current.contains(selection.anchorNode) || codeRef.current.contains(selection.focusNode)) {
            // User is selecting, defer.
            return;
          }
        }

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
        lastRenderedContentRef.current = content;
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
            <button 
              ref={copyBtnRef}
              className="code-action-btn" 
              title="Copy code" 
              onClick={handleCopy}
              dangerouslySetInnerHTML={{ __html: ICON_COPY }}
            />
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
