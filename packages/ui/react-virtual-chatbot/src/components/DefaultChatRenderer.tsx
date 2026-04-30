import React from "react";
import { ChatMessage } from "../types";
import { GeminiSparkle } from "./GeminiSparkle";
import { UniversalChatRow } from "./UniversalChatRow";

interface DefaultChatRendererProps {
  item: ChatMessage | null;
  index: number;
  codeHighlighting?: boolean;
}

/**
 * The default UI renderer for chat messages.
 * Handles assistant vs user roles and standard decoration like sparkles.
 */
export const DefaultChatRenderer = (
  item: ChatMessage | null,
  index: number,
  codeHighlighting?: boolean,
) => {
  if (item?.role === "assistant") {
    return (
      <div key={item.id} className="assistant-message-wrapper">
        <div className="ai-message-prefix">
          <GeminiSparkle isLoading={item.metadata?.isLoading} />
        </div>
        <UniversalChatRow
          item={{ ...item, index } as any}
          codeHighlighting={codeHighlighting}
        />
      </div>
    );
  }

  return (
    <UniversalChatRow
      key={item?.id || index}
      item={{ ...item, index } as any}
      codeHighlighting={codeHighlighting}
    />
  );
};
