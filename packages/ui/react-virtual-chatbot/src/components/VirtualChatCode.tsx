import React, { forwardRef, memo, useImperativeHandle, useRef, useState } from "react";
import { ISubContentHandle } from "../types";

export const VirtualChatCode = memo(
  forwardRef<ISubContentHandle, { className?: string }>(({ className }, ref) => {
    const codeRef = useRef<HTMLElement>(null);
    const langRef = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      update: (code: string, metadata?: any) => {
        if (codeRef.current) {
          codeRef.current.textContent = code;
        }
        if (langRef.current) {
          langRef.current.textContent = metadata?.language || "Code";
        }
      },
      setVisible: (visible: boolean) => {
        if (containerRef.current) {
          containerRef.current.style.display = visible ? "block" : "none";
        }
      },
    }));

    const handleCopy = () => {
      if (codeRef.current) {
        navigator.clipboard.writeText(codeRef.current.textContent || "");
      }
    };

    return (
      <div ref={containerRef} className={`virtual-chat-code-wrapper ${className}`}>
        <div className="code-header">
          <span ref={langRef} className="code-lang">TypeScript</span>
          <div className="code-actions">
            <button className="code-action-btn" title="Download">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            </button>
            <button className="code-action-btn" onClick={handleCopy} title="Copy code">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
        </div>
        <pre className="code-content">
          <code ref={codeRef}></code>
        </pre>
      </div>
    );
  }),
);

VirtualChatCode.displayName = "VirtualChatCode";
