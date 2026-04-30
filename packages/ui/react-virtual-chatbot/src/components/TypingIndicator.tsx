import React, { useEffect, useRef } from "react";
import { useChatStore } from "../store/ChatContext";
import { GeminiSparkle } from "./GeminiSparkle";

interface TypingIndicatorProps {
  renderCustom?: () => React.ReactNode;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ renderCustom }) => {
  const store = useChatStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      store.uiStatusModule.registerTypingIndicator(ref.current);
    }
    return () => {
      store.uiStatusModule.registerTypingIndicator(null);
    };
  }, [store]);

  return (
    <div
      ref={ref}
      className="typing-indicator-container"
      style={{
        display: "none",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <div className="typing-indicator-content">
        {renderCustom ? (
          renderCustom()
        ) : (
          <div className="ai-message-prefix">
            <GeminiSparkle isLoading={true} />
            <div className="gemini-typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

TypingIndicator.displayName = "TypingIndicator";
