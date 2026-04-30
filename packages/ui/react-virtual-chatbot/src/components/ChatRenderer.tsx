import { ChatMessage } from "../types";
import { ChatRow } from "./ChatRow";
import { Sparkle } from "./Sparkle";

export const ChatRenderer = (
  item: ChatMessage | null,
  index: number,
  codeHighlighting?: boolean,
) => {
  if (item?.role === "assistant") {
    return (
      <div key={item.id} className="assistant-message-wrapper">
        <div className="ai-message-prefix">
          <Sparkle isLoading={item.metadata?.isLoading} />
        </div>
        <ChatRow item={item} codeHighlighting={codeHighlighting} />
      </div>
    );
  }

  return (
    <ChatRow
      key={item?.id}
      item={item}
      codeHighlighting={codeHighlighting}
    />
  );
};
