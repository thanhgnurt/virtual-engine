import React, {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ChatMessage,
  IVirtualChatRowHandle,
  ReactVirtualChatbot,
  ReactVirtualChatbotHandle,
  UniversalChatRow,
} from "react-virtual-chatbot";
import "./App.css";

const TOPICS = [
  "Hello there!",
  "How can I help you today?",
  "I'm a high-performance virtualized chatbot engine.",
  "Check out how smoothly I scroll with thousands of messages. No React re-renders, just pure DOM speed!",
  "Virtualization is key for large data sets. We only render what you see.",
  "Speed, Efficiency, Reliability.",
  "React + Imperative DOM = 🚀",
  "The weather in the digital realm is always sunny and full of bits.",
  "Did you know that virtualization can reduce memory usage by up to 90% in large lists?",
  "I'm thinking about the future of web development. It looks fast!",
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-0",
    role: "user",
    type: "text",
    content: "sửa may mac",
  },
  {
    id: "msg-1",
    role: "assistant",
    type: "text",
    content: "# Chào mừng bạn đến với Virtual Engine!\nTôi có thể render mọi loại nội dung với tốc độ cực nhanh. Dưới đây là một số ví dụ:",
  },
  {
    id: "msg-2",
    role: "assistant",
    parts: [
      { type: "text", content: "### 1. Multi-part Message\nĐây là sự kết hợp giữa văn bản và khối code chuyên dụng:" },
      { type: "code", content: "const engine = new VirtualEngine();\nengine.start();", metadata: { language: "javascript" } },
      { type: "text", content: "Bạn có thấy khối code ở trên có nút copy và màu sắc riêng biệt không?" }
    ]
  },
  {
    id: "msg-3",
    role: "assistant",
    type: "text",
    content: "### 2. Markdown Table\nTôi cũng hỗ trợ render bảng biểu cực kỳ chuyên nghiệp:\n\n| Tính năng | Trạng thái | Hiệu năng |\n| :--- | :---: | :---: |\n| Virtualization | ✅ | Cực cao |\n| Multi-part | ✅ | Linh hoạt |\n| Markdown | ✅ | Đầy đủ |\n| Zero Re-render | ✅ | Tuyệt đối |",
  },
  {
    id: "msg-4",
    role: "user",
    type: "text",
    content: "Cho tôi xem một ví dụ về ảnh và code Python.",
  },
  {
    id: "msg-5",
    role: "assistant",
    parts: [
      { type: "text", content: "Đây là đoạn code Python để tính dãy Fibonacci:" },
      { type: "code", content: "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)", metadata: { language: "python" } },
      { type: "image", content: "https://picsum.photos/800/400?random=10" },
      { type: "text", content: "Và đây là một bức ảnh ngẫu nhiên từ thư viện." }
    ]
  },
  ...Array.from({ length: 50 }, (_, i) => ({
    id: `msg-old-${i}`,
    role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
    type: "text" as const,
    content: `Tin nhắn lịch sử số ${i}: **${TOPICS[i % TOPICS.length]}**\n- Trạng thái: *Đã xử lý*\n- Độ ưu tiên: \`Bình thường\``,
  })),
];

const ChatRow = forwardRef<IVirtualChatRowHandle<ChatMessage>, { item: ChatMessage | null }>(
  ({ item }, ref) => {
    return (
      <div className="message-row-container">
        <UniversalChatRow ref={ref} />
      </div>
    );
  },
);

const ChatInput = React.memo(({ onSend }: { onSend: (text: string) => void }) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper floating">
        <div className="input-top">
          <textarea
            ref={textareaRef}
            className="chat-input-field"
            placeholder="Ask Gemini"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            rows={1}
          />
        </div>
        <div className="input-bottom">
          <div className="input-left-actions">
            <button className="action-icon-btn"><span style={{fontSize: "20px"}}>+</span></button>
            <button className="action-icon-btn">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
               Tools
            </button>
          </div>
          <div className="input-right-actions">
            <div className="fast-selector">
              Fast 
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <button className="action-icon-btn" style={{padding: "4px"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div className="footer-disclaimer">Gemini is AI and can make mistakes.</div>
    </div>
  );
});

const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar-top">
      <div className="sidebar-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </div>
      <div className="sidebar-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
    </div>
    <div className="sidebar-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
    </div>
  </aside>
);

const ModelHeader = () => (
  <header className="model-header">
    <div className="header-left">Gemini</div>
    <div className="header-center">Greeting and Offer of Help</div>
    <div className="header-right">
      <button className="upgrade-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.59 7.41L22 10L14.59 12.59L12 20L9.41 12.59L2 10L9.41 7.41L12 2Z"/></svg>
        Upgrade to Google AI Plus
      </button>
      <div className="sidebar-icon" style={{width: "32px", height: "32px"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg></div>
      <div className="sidebar-icon" style={{width: "32px", height: "32px"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg></div>
      <div className="user-avatar">Le</div>
    </div>
  </header>
);

function App() {
  const chatbotRef = useRef<ReactVirtualChatbotHandle<ChatMessage>>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(600);

  useLayoutEffect(() => {
    if (!viewportRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const h = entries[0].contentRect.height;
      if (h > 0) setViewportHeight(h);
    });
    obs.observe(viewportRef.current);
    return () => obs.disconnect();
  }, []);

  const handleSend = useCallback((text: string) => {
    const newMessage: ChatMessage = { id: `msg-${Date.now()}`, role: "user", type: "text", content: text };
    chatbotRef.current?.appendItems([newMessage], true);
  }, []);

  const renderMessage = useCallback((item: ChatMessage | null, index: number) => {
    return <ChatRow item={item} />;
  }, []);

  return (
    <div className="workspace-layout">
      <Sidebar />
      <main className="main-workspace">
        <ModelHeader />
        <div ref={viewportRef} className="chat-viewport">
          <ReactVirtualChatbot
            ref={chatbotRef}
            items={INITIAL_MESSAGES}
            itemHeight={120}
            height={viewportHeight}
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
