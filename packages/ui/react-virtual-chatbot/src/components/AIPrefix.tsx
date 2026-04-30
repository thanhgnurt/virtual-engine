import { forwardRef, useImperativeHandle, useRef } from "react";
import { Sparkle } from "./Sparkle";

export interface AIPrefixHandle {
  setDotsVisible: (visible: boolean) => void;
  setPrefixVisible: (visible: boolean) => void;
  getDotsElement: () => HTMLDivElement | null;
  getContainerElement: () => HTMLDivElement | null;
}

/**
 * The AI message prefix containing the sparkle icon and typing indicator dots.
 */
export const AIPrefix = forwardRef<AIPrefixHandle, {}>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    setDotsVisible: (visible: boolean) => {
      if (dotsRef.current) {
        dotsRef.current.style.display = visible ? "flex" : "none";
      }
    },
    setPrefixVisible: (visible: boolean) => {
      if (containerRef.current) {
        containerRef.current.style.display = visible ? "flex" : "none";
      }
    },
    getDotsElement: () => dotsRef.current,
    getContainerElement: () => containerRef.current,
  }));

  return (
    <div ref={containerRef} className="ai-message-prefix">
      <Sparkle />
      <div
        ref={dotsRef}
        className="gemini-typing-dots"
        style={{ display: "none" }}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
});

AIPrefix.displayName = "AIPrefix";
