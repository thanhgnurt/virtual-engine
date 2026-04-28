import React from "react";

export interface GeminiSparkleProps {
  /** Whether the AI is currently generating content */
  isLoading?: boolean;
}

/**
 * The signature Gemini sparkle icon with optional pulsing animation.
 */
export const GeminiSparkle: React.FC<GeminiSparkleProps> = ({ isLoading }) => {
  return (
    <div className={`gemini-sparkle ${isLoading ? 'is-loading' : ''}`}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
      </svg>
    </div>
  );
};

GeminiSparkle.displayName = "GeminiSparkle";
