import { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from "react";
import { ISubContentHandle } from "../types";
import { setTextNode } from "../utils/dom";

// Lazy-ish import logic or just conditional usage
import hljs from "highlight.js";

const ICON_COPY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>`;
const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>`;
const ICON_DOWNLOAD = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>`;

export const VirtualChatCode = forwardRef<ISubContentHandle, { className?: string; codeHighlighting?: boolean }>(
  ({ className, codeHighlighting = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLElement>(null);
    const langRef = useRef<HTMLSpanElement>(null);
    const copyBtnRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<string>("");
    const lastMetadataRef = useRef<any>(null);
    const lastRenderedContentRef = useRef<string>("");

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

    const handleDownload = useCallback(() => {
        if (!contentRef.current) return;
        const blob = new Blob([contentRef.current], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const lang = lastMetadataRef.current?.language || 'code';
        const ext = lang === 'typescript' ? 'ts' : lang === 'javascript' ? 'js' : lang === 'python' ? 'py' : 'txt';
        a.href = url;
        a.download = `snippet.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const forceRender = useCallback(() => {
        if (!codeRef.current || contentRef.current === lastRenderedContentRef.current) return;
        
        const content = contentRef.current;
        const metadata = lastMetadataRef.current;

        if (codeHighlighting) {
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
                codeRef.current.className = "code-content hljs";
                if (langRef.current) {
                    langRef.current.textContent = detectedLang.charAt(0).toUpperCase() + detectedLang.slice(1);
                }
            } catch (e) {
                setTextNode(codeRef.current, content);
                codeRef.current.className = "code-content";
                if (langRef.current) langRef.current.textContent = "Text";
            }
        } else {
            setTextNode(codeRef.current, content);
            codeRef.current.className = "code-content";
            if (langRef.current) {
                const lang = metadata?.language || "text";
                langRef.current.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
            }
        }
        lastRenderedContentRef.current = content;
    }, [codeHighlighting]);

    useEffect(() => {
        if (codeHighlighting) {
            const handleMouseUp = () => forceRender();
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [forceRender, codeHighlighting]);

    useImperativeHandle(ref, () => ({
      update: (content, metadata) => {
        if (contentRef.current === content) return;
        
        contentRef.current = content;
        lastMetadataRef.current = metadata;

        if (codeHighlighting) {
            const selection = window.getSelection();
            if (selection && selection.type === 'Range' && codeRef.current) {
              if (codeRef.current.contains(selection.anchorNode) || codeRef.current.contains(selection.focusNode)) {
                return;
              }
            }
        }

        if (codeRef.current) {
           if (codeHighlighting && content.length < 5000) {
               forceRender();
           } else {
               setTextNode(codeRef.current, content);
               codeRef.current.className = "code-content"; // Ensure no hljs class
               if (langRef.current) {
                   const lang = metadata?.language || "text";
                   langRef.current.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
               }
           }
        }
      },
      setVisible: (visible) => {
        if (containerRef.current) {
          containerRef.current.style.display = visible ? "block" : "none";
        }
      }
    }));

    return (
      <div ref={containerRef} className={`virtual-chat-code-wrapper ${className || ""}`} style={{ display: "none" }}>
        <div className="code-header">
          <span ref={langRef} className="code-lang">Text</span>
          <div className="code-header-right">
            <button className="code-action-btn" onClick={handleDownload} title="Download code">
                <div dangerouslySetInnerHTML={{ __html: ICON_DOWNLOAD }} />
            </button>
            <button ref={copyBtnRef} className="code-action-btn" onClick={handleCopy} title="Copy code">
                <div dangerouslySetInnerHTML={{ __html: ICON_COPY }} />
            </button>
          </div>
        </div>
        <pre className="code-pre">
          <code ref={codeRef} className="code-content" />
        </pre>
      </div>
    );
  }
);

VirtualChatCode.displayName = "VirtualChatCode";
