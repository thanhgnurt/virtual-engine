import React, { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { ISubContentHandle } from "../types";

export const ChatImage = memo(
  forwardRef<ISubContentHandle, { className?: string }>(({ className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    useImperativeHandle(ref, () => ({
      update: (url: string, metadata?: any) => {
        if (imgRef.current && containerRef.current) {
          // 1. Reset opacity for new image
          imgRef.current.style.opacity = "0";
          imgRef.current.src = url;

          // 2. Rigid Pixel Locking
          const baseWidth = 600; // Our standard width
          let finalHeight = 337; // Default for 16:9 at 600px width

          if (metadata?.aspectRatio) {
            // Parse ratio "2 / 1" or "1"
            const parts = metadata.aspectRatio.split("/").map((p: string) => parseFloat(p.trim()));
            const ratio = parts.length === 2 ? parts[0] / parts[1] : parts[0];
            if (!isNaN(ratio) && ratio > 0) {
              finalHeight = Math.round(baseWidth / ratio);
            }
          }

          // Force explicit pixel dimensions - TRIPLE LOCKING
          const hStr = `${finalHeight}px`;
          const wStr = `${baseWidth}px`;

          containerRef.current.style.width = wStr;
          containerRef.current.style.minWidth = wStr;
          containerRef.current.style.maxWidth = "100%"; // Keep responsive on small screens

          containerRef.current.style.height = hStr;
          containerRef.current.style.minHeight = hStr;
          containerRef.current.style.maxHeight = hStr;
        }
      },
      setVisible: (visible: boolean) => {
        if (containerRef.current) {
          containerRef.current.style.display = visible ? "block" : "none";
        }
      },
    }));

    const handleLoad = () => {
      if (imgRef.current) {
        imgRef.current.style.opacity = "1";
      }
    };

    return (
      <div
        ref={containerRef}
        className={`virtual-chat-image-container ${className || ""}`}
        style={{ 
          display: "none", 
          width: "600px", 
          maxWidth: "100%", 
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#f0f4f8",
          borderRadius: "12px"
        }}
      >
        <img
          ref={imgRef}
          className="chat-image-content"
          onLoad={handleLoad}
          style={{ 
            width: "100%", 
            height: "100%", 
            display: "block", 
            objectFit: "cover",
            opacity: 0,
            transition: "opacity 0.3s ease-in-out" 
          }}
          alt="Chat attachment"
        />
      </div>
    );
  }),
);

ChatImage.displayName = "ChatImage";
