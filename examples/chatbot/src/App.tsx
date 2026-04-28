import { useCallback, useRef, useLayoutEffect } from "react";
import {
  ChatInput,
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
}`
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
    return df.dropna()`
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
ORDER BY total_spent DESC;`
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
}`
  }
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-0",
    role: "user" as const,
    content: "Chào Gemini! Hãy cho tôi xem một ví dụ về React Custom Hook chuyên nghiệp.",
  },
  {
    id: "msg-1",
    role: "assistant" as const,
    parts: [
      {
        type: "text",
        content: "Dưới đây là một ví dụ về `useDebounce` hook được viết bằng TypeScript để tối ưu hóa hiệu năng cho các ô tìm kiếm:",
      },
      {
        type: "code",
        content: COMPLEX_CODE_SNIPPETS[0].code,
        metadata: { language: COMPLEX_CODE_SNIPPETS[0].lang },
      },
    ],
  },
  {
    id: "msg-stress",
    role: "assistant" as const,
    content: `### Stress Test: Nội dung cực dài
Đây là một ví dụ về tin nhắn có chiều cao rất lớn để kiểm tra khả năng đo đạc của engine:

${Array.from({ length: 15 }, (_, i) => `Đoạn văn số ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`).join("\n\n")}

Kết thúc Stress Test.`
  },
  ...Array.from({ length: 1000 }, (_, i) => {
    const dice = i % 10;
    let parts: ChatPart[] = [];
    if (dice < 6) {
      const p = (i % 3) + 1;
      const text = Array.from({ length: p }, () => `Tin nhắn văn bản thứ ${i}: Đây là nội dung mô phỏng hội thoại thực tế để kiểm tra khả năng xử lý chiều cao thay đổi linh hoạt của engine ảo hóa.`).join("\n\n");
      parts = [{ type: "text", content: text }];
    } else if (dice === 6) {
      parts = [{ type: "text", content: `Bảng dữ liệu phân tích ${i}:\n\n| Chỉ số | Giá trị |\n| :--- | :---: |\n| Hiệu năng | ${95 + (i % 5)}% |\n| Độ trễ | ${i % 10}ms |` }];
    } else if (dice === 7) {
      const snippet = COMPLEX_CODE_SNIPPETS[i % COMPLEX_CODE_SNIPPETS.length];
      parts = [
        { type: "text", content: `Dưới đây là đoạn mã nguồn ${snippet.lang} mẫu số ${i}:` },
        { type: "code", content: snippet.code, metadata: { language: snippet.lang } }
      ];
    } else if (dice === 8) {
      parts = [
        { type: "text", content: `Hình ảnh minh họa cho topic ${TOPICS[i % TOPICS.length]}:` },
        { 
          type: "image", 
          content: `https://picsum.photos/600/300?random=${i}`,
          metadata: { aspectRatio: "2 / 1" }
        }
      ];
    } else {
      parts = [
        { type: "text", content: `Trích dẫn quan trọng ${i}:` },
        { type: "text", content: `> "Sáng tạo là chìa khóa của tương lai, và hiệu năng là nền tảng của sự trải nghiệm."` }
      ];
    }
    return { id: `msg-old-${i}`, role: (i % 2 === 0 ? "user" : "assistant") as any, parts };
  }),
];

const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar-top">
      <div className="sidebar-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </div>
      <div className="sidebar-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
    </div>
    <div className="sidebar-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    </div>
  </aside>
);

const ModelHeader = () => (
  <header className="model-header">
    <div className="header-left">Gemini Advanced</div>
    <div className="header-center">Greeting and Offer of Help</div>
    <div className="header-right">
      <button className="upgrade-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.59 7.41L22 10L14.59 12.59L12 20L9.41 12.59L2 10L9.41 7.41L12 2Z" />
        </svg>
        Upgrade to Google AI Plus
      </button>
      <div className="sidebar-icon" style={{ width: "32px", height: "32px" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
        </svg>
      </div>
      <div className="sidebar-icon" style={{ width: "32px", height: "32px" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </div>
      <div className="user-avatar">Le</div>
    </div>
  </header>
);

function App() {
  const chatbotRef = useRef<ReactVirtualChatbotHandle<ChatMessage>>(null);

  useLayoutEffect(() => {
    // Initial scroll to bottom after engine is ready
    const timer = setTimeout(() => {
      chatbotRef.current?.scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = useCallback((text: string) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user" as const,
      content: text,
    };
    chatbotRef.current?.appendItems([newMessage], true);
  }, []);

  const renderMessage = useCallback(
    () => <UniversalChatRow />,
    [],
  );

  return (
    <div className="workspace-layout">
      <Sidebar />
      <main className="main-workspace">
        <ModelHeader />
        <div className="chat-viewport">
          <ReactVirtualChatbot
            ref={chatbotRef}
            items={INITIAL_MESSAGES}
            renderItem={renderMessage}
            className="virtual-chatbot-list"
            followOutput={true}
          />
        </div>
        <ChatInput onSend={handleSend} />
      </main>
    </div>
  );
}

export default App;
