import React from "react";

export interface SparkleProps {
  /** Whether the AI is currently generating content */
  isLoading?: boolean;
}

/**
 * The signature sparkle icon with optional pulsing animation.
 */
export const Sparkle: React.FC<SparkleProps> = ({ isLoading }) => {
  return (
    <div className={`chat-sparkle ${isLoading ? 'is-loading' : ''}`}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
      </svg>
    </div>
  );
};

Sparkle.displayName = "Sparkle";
