import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatInput,
  type ChatInputHandle,
  ChatMessage,
  IChatFetcher,
  ReactVirtualChatbot,
  ReactVirtualChatbotHandle,
} from "react-virtual-chatbot";
import "./App.css";

interface ModelInfo {
  id: string;
  name: string;
  desc: string;
  icon: string;
  isFree?: boolean;
}

const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar-top">
      <div className="sidebar-icon" title="Main Menu">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </div>
    </div>
  </aside>
);

const MOCK_MESSAGES: ChatMessage[] = Array.from({ length: 50 }).map((_, i) => {
  const isUser = i % 2 === 0;
  const id = `msg_${i + 1}`;
  
  if (i === 0) return { id, role: "user", content: "Chào bạn! Engine này có hỗ trợ code không?" };
  if (i === 1) return { 
    id, role: "assistant", 
    content: "Chào bạn! Hệ thống hỗ trợ rất tốt. Đây là ví dụ về Rust:\n\n```rust\nfn main() {\n    println!(\"Hello, Virtual Engine!\");\n}\n```" 
  };
  
  if (i % 7 === 0) return {
    id, role: "assistant",
    content: "Đây là một hình ảnh minh họa cho khả năng hiển thị media:",
    metadata: { url: `https://picsum.photos/seed/${i}/800/${300 + (i % 3) * 100}`, aspectRatio: "1.6" }
  };

  if (i % 5 === 0) return {
    id, role: "assistant",
    content: "Để tôi giải thích chi tiết hơn về cơ chế Virtualization:\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
  };

  return {
    id,
    role: isUser ? "user" : "assistant",
    content: isUser 
        ? (i % 3 === 0 ? "Viết cho mình đoạn code Python tính số nguyên tố nhé." : "Cho mình xem một hình ảnh đẹp đi.")
        : (i % 4 === 0 ? "Tất nhiên rồi! Đây là đoạn code bạn cần:\n\n```python\ndef is_prime(n):\n    return n > 1 and all(n % i for i in range(2, int(n**0.5) + 1))\n```" : "Hệ thống của chúng tôi luôn sẵn sàng hỗ trợ bạn bất cứ lúc nào.")
  };
});

function App() {
  const [apiKey, setApiKey] = useState(
    "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",
  );
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [chatState, setChatState] = useState<any>({
    isStreaming: false,
    selectedModelId: "",
  });

  const chatbotRef = useRef<ReactVirtualChatbotHandle<ChatMessage>>(null);
  const inputRef = useRef<ChatInputHandle>(null);

  useEffect(() => {
    if (chatbotRef.current) {
      chatbotRef.current.appendItems(MOCK_MESSAGES);
    }
  }, []);

  // --- 1. Fallback Fetcher Implementation ---
  const fallbackFetcher = useRef<IChatFetcher>({
    async *fetchStream(params: any) {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${params.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Virtual Chatbot",
          },
          body: JSON.stringify({
            model: params.modelId,
            messages: params.messages,
            stream: true,
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "MODEL_OUT_OF_QUOTA: This model is currently at its rate limit. Please select another model.",
          );
        }
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Could not read stream.");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.trim() === "" || line.trim() === "data: [DONE]") continue;
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.substring(6));
              const content = json.choices?.[0]?.delta?.content || "";
              if (content) yield content;
            } catch (e) {}
          }
        }
      }
    },
  }).current;

  // Fetch OpenRouter Models
  useEffect(() => {
    if (!apiKey) return;
    fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Virtual Chatbot",
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          const models: ModelInfo[] = data.data
            .map((m: any) => {
              const isFree =
                m.pricing?.prompt === "0" && m.pricing?.completion === "0";
              return {
                id: m.id,
                name: (isFree ? "✨ " : "") + (m.name || m.id),
                desc: m.description || "OpenRouter Model",
                icon: m.id.includes("gpt")
                  ? "🤖"
                  : m.id.includes("claude")
                    ? "🧠"
                    : m.id.includes("gemini")
                      ? "✨"
                      : "🌟",
                isFree: isFree,
              };
            })
            .sort((a: ModelInfo, b: ModelInfo) => {
              if (a.isFree && !b.isFree) return -1;
              if (!a.isFree && b.isFree) return 1;
              return 0;
            });
          setAvailableModels(models);
          if (models.length > 0 && chatbotRef.current) {
            const models = data.data; // Use raw data if needed or already mapped
            // The chatbot will automatically handle its own selection if we don't override it,
            // but we can still set it here if we want to sync the very first time.
          }
        }
      })
      .catch((e) => console.error("Lỗi lấy model OpenRouter:", e));
  }, [apiKey]);

  const handleSend = useCallback((text: string) => {
    chatbotRef.current?.sendMessage(text);
    chatbotRef.current?.focusLastItem();
  }, []);

  const handleStop = useCallback(() => {
    chatbotRef.current?.stopStreaming();
  }, []);

  return (
    <div className="gemini-app-container">
      <Sidebar />
      <div className="gemini-main-content">
        <header className="gemini-header">
          <div className="header-left">
            <h1 className="logo-text">Gemini</h1>
          </div>
          <div className="header-center">
            <div className="api-key-input-wrapper">
              <input
                type="password"
                placeholder="Dán OpenRouter API Key vào đây..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  chatbotRef.current?.setApiKey(e.target.value);
                }}
                className="api-key-input"
              />
            </div>
          </div>
          <div className="header-right">
            <div className="user-pill">Le</div>
          </div>
        </header>

        <main className="gemini-main">
          <ReactVirtualChatbot
            ref={chatbotRef}
            apiKey={apiKey}
            fallbackFetcher={fallbackFetcher}
            onStateChange={(state: any) => setChatState(state)}
            followOutput={true}
            codeHighlighting={true}
            history={MOCK_MESSAGES}
          />
        </main>

        <footer className="gemini-footer">
          <ChatInput
            ref={inputRef}
            onSend={handleSend}
            onStop={handleStop}
            availableModels={availableModels}
            selectedModelId={chatState.selectedModelId}
            onModelSelect={(model) =>
              chatbotRef.current?.setSelectedModel(model.id)
            }
            isStreaming={chatState.isStreaming}
          />
        </footer>
      </div>
    </div>
  );
}

export default App;
