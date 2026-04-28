import { useCallback, useLayoutEffect, useRef } from "react";
import {
  ChatInput,
  type ChatInputHandle,
  ChatMessage,
  ChatPart,
  ReactVirtualChatbot,
  ReactVirtualChatbotHandle,
  UniversalChatRow,
} from "react-virtual-chatbot";
import "./App.css";

const TOPICS = [
  "Trí tuệ nhân tạo",
  "Phát triển web mượt mà",
  "Tối ưu hóa hiệu năng",
  "Thiết kế giao diện hiện đại",
  "Trải nghiệm người dùng",
];

const COMPLEX_CODE_SNIPPETS = [
  {
    lang: "typescript",
    code: `function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}`,
  },
  {
    lang: "python",
    code: `import pandas as pd
import numpy as np

def analyze_market_data(df):
    # Calculate daily returns
    df['returns'] = df['close'].pct_change()

    # Calculate rolling volatility
    df['volatility'] = df['returns'].rolling(window=20).std() * np.sqrt(252)

    # Identify signal crossovers
    df['signal'] = np.where(df['sma_20'] > df['sma_50'], 1, 0)
    return df.dropna()`,
  },
  {
    lang: "sql",
    code: `SELECT
    u.id,
    u.username,
    COUNT(o.id) as total_orders,
    SUM(o.amount) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id
HAVING total_spent > 1000
ORDER BY total_spent DESC;`,
  },
  {
    lang: "css",
    code: `.gemini-gradient-text {
  background: linear-gradient(90deg, #4b90ff, #ff5546, #9176ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 3s infinite linear;
  background-size: 200% auto;
}

@keyframes shine {
  to { background-position: 200% center; }
}`,
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-0",
    role: "user" as const,
    content:
      "Chào Gemini! Hãy cho tôi biết về các mẹo tối ưu hóa Performance Engineering cho tin nhắn ngắn.",
  },
  {
    id: "msg-1",
    role: "assistant" as const,
    content: `Có vẻ như bạn đang thực hiện một bài kiểm tra phím ngẫu nhiên hoặc kiểm tra độ trễ (latency) của hệ thống.

Dưới đây là một vài phân tích nhanh dưới góc độ **Performance Engineering** cho các loại tin nhắn ngắn và ngẫu nhiên như "fd", "jj":

**1. Phân bổ bộ nhớ (Memory Allocation)**
Với các chuỗi ký tự ngắn như thế này, nếu hệ thống không được tối ưu, việc tạo ra hàng ngàn đối tượng \`string\` nhỏ sẽ làm tăng tần suất hoạt động của **Garbage Collector (GC)**.

*   **Mẹo tối ưu:** Sử dụng cơ chế \`string interning\` hoặc tái sử dụng các buffer nếu bạn đang xử lý dữ liệu ở mức độ thấp (low-level).

**2. Xử lý UI/UX cho tin nhắn ngắn**
Khi nội dung quá ngắn, việc ảo hóa cần phải cực kỳ nhạy bén để không gây ra hiện tượng nhảy vọt (layout shift) khi cuộn.`,
  },
  ...Array.from({ length: 100 }, (_, i) => {
    const dice = i % 10;
    let parts: ChatPart[] = [];
    if (dice < 6) {
      parts = [
        {
          type: "text",
          content: `Tin nhắn mẫu thứ ${i}: Đây là nội dung mô phỏng để kiểm tra khả năng ảo hóa.`,
        },
      ];
    } else if (dice === 7) {
      const snippet = COMPLEX_CODE_SNIPPETS[i % COMPLEX_CODE_SNIPPETS.length];
      parts = [
        { type: "text", content: `Đoạn mã ${snippet.lang} mẫu số ${i}:` },
        {
          type: "code",
          content: snippet.code,
          metadata: { language: snippet.lang },
        },
      ];
    } else if (dice === 8) {
      parts = [
        {
          type: "image",
          content: `https://picsum.photos/600/300?random=${i}`,
          metadata: { aspectRatio: "2 / 1" },
        },
      ];
    } else {
      parts = [{ type: "text", content: `Nội dung ngẫu nhiên ${i}` }];
    }
    return {
      id: `msg-old-${i}`,
      role: (i % 2 === 0 ? "user" : "assistant") as any,
      parts,
    };
  }),
];

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
      <div className="sidebar-icon" title="New Chat">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </div>
    </div>
    <div className="sidebar-icon" title="Settings">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    </div>
  </aside>
);

function App() {
  const chatbotRef = useRef<ReactVirtualChatbotHandle<ChatMessage>>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const activeAiIdxRef = useRef(-1);

  useLayoutEffect(() => {
    chatbotRef.current?.scrollToBottom();
  }, []);

  const handleSend = useCallback((text: string) => {
    const chatbot = chatbotRef.current;
    if (!chatbot) return;

    if (activeAiIdxRef.current !== -1) {
      chatbot.patchMetadata(activeAiIdxRef.current, { minHeight: null });
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "...",
      metadata: { minHeight: "80vh" },
    };

    chatbot.appendItems([userMsg, aiMsg], false);

    const total = chatbot.getTotalCount();
    const userIdx = total - 2;
    const aiIdx = total - 1;
    activeAiIdxRef.current = aiIdx;

    const dice = Math.random();
    let fullText = "";

    if (dice < 0.4) {
      fullText = `### Phân tích: ${text}\n\nDưới đây là bài phân tích chi tiết về yêu cầu của bạn:\n\n${Array.from({ length: 5 }, (_, i) => `Điểm số ${i + 1}: Nội dung chi tiết về khía cạnh này giúp người dùng hiểu sâu hơn về vấn đề đang thảo luận.`).join("\n\n")}\n\nKết luận: Mọi thứ đều đang hoạt động hoàn hảo trên Virtual Engine.`;
    } else if (dice < 0.8) {
      const snippet =
        COMPLEX_CODE_SNIPPETS[
          Math.floor(Math.random() * COMPLEX_CODE_SNIPPETS.length)
        ];
      fullText = `Tôi đã tạo một đoạn mã mẫu ${snippet.lang} cho bạn:\n\n\`\`\`${snippet.lang}\n${snippet.code}\n\`\`\`\n\nHy vọng đoạn code này giúp ích cho dự án của bạn!`;
    } else {
      fullText = `Dưới đây là bảng so sánh hiệu năng cho yêu cầu "${text}":\n\n| Chỉ số | Gemini Advanced | Model khác |\n| :--- | :---: | :---: |\n| Tốc độ nhả chữ | Cực nhanh | Trung bình |\n| Độ ổn định | 99.9% | 85% |\n| Trải nghiệm | 10/10 | 7/10 |\n\nBạn có muốn tìm hiểu thêm về chỉ số nào không?`;
    }

    inputRef.current?.setStreaming(true);
    const words = fullText.split(" ");
    let currentIdx = 0;
    let currentContent = "";

    const streamInterval = setInterval(() => {
      if (currentIdx >= words.length) {
        clearInterval(streamInterval);
        inputRef.current?.setStreaming(false);
        if (activeAiIdxRef.current !== -1) {
          chatbot.patchMetadata(activeAiIdxRef.current, { minHeight: null });
          activeAiIdxRef.current = -1;
        }
        return;
      }
      const chunk = words.slice(currentIdx, currentIdx + 3).join(" ");
      currentContent += (currentContent ? " " : "") + chunk;
      currentIdx += 3;
      chatbot.updateMessageText(aiIdx, currentContent);
    }, 40);
  }, []);

  const renderMessage = useCallback(
    (item: ChatMessage | null, index: number) => {
      return <UniversalChatRow key={item?.id || index} item={item} />;
    },
    [],
  );

  return (
    <div className="gemini-app-container">
      <Sidebar />
      <div className="gemini-main-content">
        <header className="gemini-header">
          <div className="header-left">
            <h1 className="logo-text">Gemini</h1>
          </div>
          <div className="header-center">
            <div className="chat-title">Greeting and Offer of Help</div>
          </div>
          <div className="header-right">
            <button className="upgrade-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1a73e8">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
              <span>Upgrade to Gemini Advanced</span>
            </button>
            <div className="user-pill">Le</div>
          </div>
        </header>

        <main className="gemini-main">
          <ReactVirtualChatbot
            ref={chatbotRef}
            items={INITIAL_MESSAGES}
            renderItem={renderMessage}
            itemHeight={120}
            followOutput={false}
          />
        </main>

        <footer className="gemini-footer">
          <ChatInput ref={inputRef} onSend={handleSend} />
        </footer>
      </div>
    </div>
  );
}

export default App;
