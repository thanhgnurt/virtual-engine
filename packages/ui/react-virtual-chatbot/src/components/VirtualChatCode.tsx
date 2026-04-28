import React, { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { ISubContentHandle } from "../types";

export const VirtualChatCode = memo(
  forwardRef<ISubContentHandle, { className?: string }>(({ className }, ref) => {
    const domRef = useRef<HTMLPreElement>(null);

    useImperativeHandle(ref, () => ({
      update: (code: string, metadata?: any) => {
        if (domRef.current) {
          domRef.current.textContent = code;
          if (metadata?.language) {
            domRef.current.setAttribute("data-lang", metadata.language);
          }
        }
      },
      setVisible: (visible: boolean) => {
        if (domRef.current) domRef.current.style.display = visible ? "block" : "none";
      },
    }));

    return (
      <pre
        ref={domRef}
        className={className}
        style={{ overflowX: "auto", padding: "12px", borderRadius: "8px" }}
      />
    );
  }),
);

VirtualChatCode.displayName = "VirtualChatCode";
