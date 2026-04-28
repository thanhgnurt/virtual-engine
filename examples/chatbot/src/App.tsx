import { forwardRef, useCallback, useRef } from "react";
import {
  ChatInput,
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
    content:
      "# Chào mừng bạn đến với Virtual Engine!\nTôi có thể render mọi loại nội dung với tốc độ cực nhanh. Dưới đây là một số ví dụ:",
  },
  {
    id: "msg-2",
    role: "assistant",
    parts: [
      {
        type: "text",
        content:
          "### 1. Multi-part Message\nĐây là sự kết hợp giữa văn bản và khối code chuyên dụng:",
      },
      {
        type: "code",
        content: "const engine = new VirtualEngine();\nengine.start();",
        metadata: { language: "javascript" },
      },
      {
        type: "text",
        content:
          "Bạn có thấy khối code ở trên có nút copy và màu sắc riêng biệt không?",
      },
    ],
  },
  {
    id: "msg-1",
    role: "assistant",
    content:
      "Chào bạn! Tôi là Gemini, trợ lý AI của bạn. Hôm nay tôi có thể hỗ trợ bạn điều gì? Tôi có khả năng phân tích dữ liệu, viết mã nguồn, giải thích các khái niệm khoa học phức tạp hoặc thậm chí là cùng bạn lập kế hoạch cho chuyến đi sắp tới. Hãy bắt đầu bằng cách đặt bất kỳ câu hỏi nào bạn đang quan tâm nhé!",
  },
  {
    id: "msg-2",
    role: "user",
    content: "Hãy phân tích cho tôi về ưu điểm của Virtual Engine mà chúng ta đang xây dựng.",
  },
  {
    id: "msg-3",
    role: "assistant",
    parts: [
      {
        type: "text",
        content:
          "Hệ thống **Virtual Engine** mà chúng ta đang phát triển mang lại những đột phá đáng kể so với các giải pháp truyền thống. Dưới đây là bảng so sánh chi tiết về hiệu năng và trải nghiệm người dùng:\n\n| Chỉ số | Truyền thống (React) | Virtual Engine (Imperative) |\n| :--- | :---: | :---: |\n| Khả năng chịu tải | ~1,000 items | **>1,000,000 items** |\n| Tốc độ render | Phụ thuộc vào Diffing | **Tức thời (0ms)** |\n| Bộ nhớ (RAM) | Tăng theo số lượng DOM | **Cố định (Fixed Pool)** |\n| Trải nghiệm cuộn | Dễ bị giật (Jank) | **Siêu mượt (60fps)** |",
      },
      {
        type: "text",
        content:
          "Cơ chế này hoạt động dựa trên việc tái sử dụng một 'Pool' các DOM nodes cố định. Khi bạn cuộn, chúng ta không tạo mới phần tử mà chỉ cập nhật dữ liệu vào các nodes hiện có. Điều này loại bỏ hoàn toàn quá trình Garbage Collection nặng nề của trình duyệt.",
      },
    ],
  },
  {
    id: "msg-6",
    role: "assistant",
    parts: [
      {
        type: "text",
        content:
          "### Hướng dẫn: Tối ưu ChatInput và Header\nĐể ứng dụng đạt độ mượt tối đa, bạn nên áp dụng cấu trúc Component sạch như sau. Lưu ý việc sử dụng `React.memo` và tách biệt logic đo đạc chiều cao.",
      },
      {
        type: "code",
        content: `// components/ModelHeader.tsx
// Sử dụng memo để ngăn chặn re-render không cần thiết
export const ModelHeader = React.memo(() => {
  console.log("Header rendered only once!");
  return (
    <header className="model-header">
      <div className="header-left">Gemini Advanced</div>
      <div className="header-right">
        <button className="upgrade-btn">Active Plan</button>
      </div>
    </header>
  );
});`,
        metadata: { language: "typescript" },
      },
      {
        type: "text",
        content:
          "Việc kết hợp giữa **React cho UI tĩnh** và **Imperative DOM cho dữ liệu động** là chìa khóa để xây dựng các ứng dụng Chatbot đẳng cấp thế giới như Gemini.",
      },
    ],
  },
  {
    id: "msg-7",
    role: "user",
    content: "Cho tôi xem một hình ảnh đẹp về Vịnh Hạ Long để tôi có thêm cảm hứng.",
  },
  {
    id: "msg-8",
    role: "assistant",
    parts: [
      {
        type: "text",
        content: "Vịnh Hạ Long, một trong bảy kỳ quan thiên nhiên mới của thế giới, luôn là nguồn cảm hứng bất tận với vẻ đẹp kỳ vĩ của hàng ngàn hòn đảo đá vôi mọc lên từ làn nước xanh ngọc bích.",
      },
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&q=80&w=1200",
        metadata: { alt: "Vịnh Hạ Long" }
      },
      {
        type: "text",
        content: "Dù bạn đến đây vào mùa hè rực nắng hay mùa đông mờ ảo trong sương, Vịnh Hạ Long vẫn luôn giữ được sức hút mê hoặc khó cưỡng. Bạn có muốn tôi gợi ý một lịch trình du lịch 3 ngày 2 đêm tại đây không?",
      }
    ],
  },
  ...Array.from({ length: 50 }, (_, i) => ({
    id: `msg-old-${i}`,
    role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
    type: "text" as const,
    content: `Tin nhắn lịch sử số ${i}: **${TOPICS[i % TOPICS.length]}**\n- Trạng thái: *Đã xử lý*\n- Độ ưu tiên: \`Bình thường\``,
  })),
];

const ChatRow = forwardRef<
  IVirtualChatRowHandle<ChatMessage>,
  { item: ChatMessage | null }
>(({ item }, ref) => {
  return (
    <div className="message-row-container">
      <UniversalChatRow ref={ref} />
    </div>
  );
});

const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar-top">
      <div className="sidebar-icon">
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
      <div className="sidebar-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
    </div>
    <div className="sidebar-icon">
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

const ModelHeader = () => (
  <header className="model-header">
    <div className="header-left">Gemini</div>
    <div className="header-center">Greeting and Offer of Help</div>
    <div className="header-right">
      <button className="upgrade-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.59 7.41L22 10L14.59 12.59L12 20L9.41 12.59L2 10L9.41 7.41L12 2Z" />
        </svg>
        Upgrade to Google AI Plus
      </button>
      <div className="sidebar-icon" style={{ width: "32px", height: "32px" }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
        </svg>
      </div>
      <div className="sidebar-icon" style={{ width: "32px", height: "32px" }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const handleSend = useCallback((text: string) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      type: "text",
      content: text,
    };
    chatbotRef.current?.appendItems([newMessage], true);
  }, []);

  const renderMessage = useCallback(
    (item: ChatMessage | null, index: number) => {
      return <ChatRow item={item} />;
    },
    [],
  );

  return (
    <div className="workspace-layout">
      <Sidebar />
      <main className="main-workspace">
        <ModelHeader />
        <div ref={viewportRef} className="chat-viewport">
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
