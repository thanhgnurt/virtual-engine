import React, { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { ISubContentHandle } from "../types";

export const VirtualChatImage = memo(
  forwardRef<ISubContentHandle, { className?: string }>(({ className }, ref) => {
    const domRef = useRef<HTMLImageElement>(null);

    useImperativeHandle(ref, () => ({
      update: (url: string) => {
        if (domRef.current) domRef.current.src = url;
      },
      setVisible: (visible: boolean) => {
        if (domRef.current) domRef.current.style.display = visible ? "block" : "none";
      },
    }));

    return (
      <img
        ref={domRef}
        className={`virtual-chat-image-wrapper ${className || ""}`}
        style={{ display: "none" }}
        alt="Chat attachment"
      />
    );
  }),
);

VirtualChatImage.displayName = "VirtualChatImage";
