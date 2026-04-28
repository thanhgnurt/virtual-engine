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

const LONG_TEXT_SAMPLES = [
  "Lập trình là một hành trình thú vị nhưng cũng đầy thử thách. Để trở thành một kỹ sư phần mềm giỏi, bạn không chỉ cần học cú pháp của một ngôn ngữ mà còn phải hiểu sâu về kiến trúc hệ thống, cấu trúc dữ liệu và giải thuật. Ngoài ra, kỹ năng giải quyết vấn đề và tư duy phản biện là yếu tố then chốt giúp bạn vượt qua những bài toán phức tạp trong thực tế.",
  "### Hướng dẫn tối ưu hóa Hiệu năng:\n1. Sử dụng Virtualization cho các danh sách lớn.\n2. Tránh re-render không cần thiết bằng cách sử dụng React.memo.\n3. Tối ưu hóa các tác vụ tính toán nặng bằng Web Workers.\n4. Giảm thiểu kích thước bundle bằng cách dynamic import.",
  "Trong kỷ nguyên AI hiện nay, việc tích hợp các mô hình ngôn ngữ lớn (LLM) vào ứng dụng đang trở thành xu hướng tất yếu. Các nhà phát triển cần làm quen với việc xử lý dữ liệu dạng stream, thiết kế prompt hiệu quả và quản lý ngữ cảnh hội thoại để mang lại trải nghiệm tốt nhất cho người dùng cuối.",
  "Có vẻ như bạn đang kiểm tra giới hạn hoặc vô tình bị ngắt quãng khi gõ phím. Với một kỹ sư chuyên về High-performance Frontend như Trung, những tin nhắn \"dở dang\" như thế này thực chất lại là những kịch bản thú vị để tối ưu hóa UI/UX:\n\n1. **Xử lý \"Input State\" thời gian thực**\nTrong các chatbot hiện đại như Gemini, ngay cả khi bạn chưa nhấn Enter, hệ thống có thể thực hiện:\n*   Predictive Text: Dự đoán từ tiếp theo để hỗ trợ người dùng gõ nhanh hơn.\n*   Draft Saving: Tự động lưu bản nháp vào localStorage để tránh mất nội dung khi refresh trang.\n\n2. **Tối ưu cho Virtual Engine với tin nhắn ngắn**\nKhi nội dung chỉ có vài ký tự như \"hell\", gánh nặng của react-virtual-engine không nằm ở việc hiển thị, mà ở việc quản lý các thuộc tính phụ (metadata):\n*   Row Overlay: Đảm bảo các thành phần như Avatar hay Time-stamp không bị lệch khi chiều cao của hàng (Row height) đạt mức tối thiểu.\n*   Text Shapers: Trình duyệt xử lý các chuỗi ngắn cực nhanh, nhưng nếu bạn có hàng chục ngàn tin nhắn như vậy, việc sử dụng `contain: strict` trong CSS sẽ giúp trình duyệt bỏ qua việc tính toán lại layout cho các hàng đã ẩn.\n\n3. **Trạng thái \"AI đang chờ đợi\"**\nNếu hệ thống nhận thấy người dùng ngừng gõ trong một khoảng thời gian (debounce), nó có thể hiển thị các gợi ý (Suggestion Chips) dựa trên từ khóa đang gõ dở:\n*   Gợi ý: [ \"Hello!\", \"Help with Mac\", \"How are you?\" ]\n\nMột lưu ý nhỏ về chiếc Mac của bạn:\nNếu bạn đang gõ \"hello\" mà bị mất chữ cuối, có thể là do dính phím (Sticky Keys) do bụi bẩn, hoặc Trackpad Interference khi vô tình chạm tay làm mất focus ô input.",
  "Dưới đây là một đoạn mã mẫu về cách sử dụng `useEffect` trong React:\n\n```javascript\nuseEffect(() => {\n  console.log('Component mounted');\n  return () => console.log('Cleanup');\n}, []);\n```"
];

const INITIAL_MESSAGES: ChatMessage[] = Array.from({ length: 100 }, (_, i) => {
  const isUser = i % 2 === 0;
  const dice = i % 5;
  let content = LONG_TEXT_SAMPLES[dice];
  
  if (dice === 0) {
    content += " " + "Phân tích độ phức tạp thời gian O(n log n) là rất quan trọng khi tối ưu hóa các giải thuật sắp xếp như Merge Sort hay Quick Sort trong các ứng dụng xử lý dữ liệu lớn.";
  }

  // Force the last item to be a beautifully structured long message for testing
  if (i === 99) {
    content = `### BÀI PHÂN TÍCH CHUYÊN SÂU VỀ HỆ THỐNG VIRTUAL ENGINE (PHẦN MỞ RỘNG)

Hệ thống **Virtualization** mà chúng ta đang xây dựng không chỉ đơn thuần là ẩn/hiện các phần tử. Nó là một bài toán nghệ thuật về quản lý bộ nhớ và hiệu năng Render. Dưới đây là cái nhìn chi tiết hơn về các tầng kiến trúc:

**1. Cơ chế Slot Recycling (Tái sử dụng khung hình)**
Khi danh sách đạt tới hàng ngàn tin nhắn, việc giữ toàn bộ DOM node sẽ làm trình duyệt quá tải. Engine của chúng ta sử dụng cơ chế:
*   **Static Containers:** Giữ các slot cố định trên màn hình để tránh tạo mới DOM liên tục.
*   **Imperative Updates:** Đổ dữ liệu trực tiếp vào DOM thay vì re-render React toàn bộ component.
*   **Zero-Allocation:** Hạn chế tạo object mới khi cuộn để giảm áp lực cho Garbage Collector (GC).

**2. Thách thức về Chiều cao Động (Dynamic Height)**
Đây là phần khó nhất trong Virtual List. Chúng ta xử lý bằng cách:
*   Sử dụng **ResizeObserver** để lắng nghe sự thay đổi ngay khi dữ liệu được đổ vào.
*   Cập nhật lại toàn bộ bản đồ **Offset** một cách tức thì sau mỗi lần đo.
*   Đảm bảo thanh cuộn luôn phản ánh đúng thực tế dù nội dung có biến thiên đến đâu.

**3. So sánh Hiệu năng (Benchmarks)**
Dưới đây là bảng so sánh giữa giải pháp truyền thống và Virtual Engine:

| Chỉ số | Truyền thống (1000 items) | Virtual Engine (1000 items) |
| :--- | :---: | :---: |
| DOM Nodes | 10,000+ | ~20 |
| Memory Usage | 250MB | 15MB |
| Frame Rate (60FPS) | Thường xuyên drop | Ổn định 60FPS |

**4. Lộ trình Phát triển Tương lai (Roadmap)**
Chúng ta sẽ không dừng lại ở đây. Các bước tiếp theo bao gồm:
1.  **AI-Powered Scrolling:** Dự đoán hướng cuộn của người dùng để pre-fetch dữ liệu.
2.  **Multi-Column Support:** Hỗ trợ ảo hóa cho các giao diện dạng Grid phức tạp hơn.
3.  **Cross-Platform Adapter:** Đưa Engine này lên các nền tảng khác như Mobile (React Native).

**5. Ví dụ về Cấu trúc Dữ liệu Nội bộ**
Dưới đây là cách mà Engine lưu trữ các mốc vị trí (offsets):
\`\`\`typescript
interface LayoutMap {
  index: number;
  offsetTop: number;
  height: number;
}
// Map này được cập nhật O(1) hoặc O(log n) tùy vào chiến thuật.
\`\`\`

Hy vọng bài phân tích siêu dài này không chỉ giúp bạn hiểu rõ về "nội công" phía sau mà còn giúp chúng ta kiểm tra được khả năng chịu tải cực hạn của hệ thống render!`.repeat(2);
  }

  const message: ChatMessage = {
    id: `msg-old-${i}`,
    role: isUser ? ("user" as const) : ("assistant" as const),
    content: content,
  };

  // Occasionally add an image to assistant messages for variety (but not for the last long one)
  if (!isUser && i % 15 === 0 && i !== 99) {
    message.parts = [
      { type: "text", content: content },
      { 
        type: "image", 
        content: `https://picsum.photos/800/400?random=${i}`,
        metadata: { aspectRatio: "2 / 1" }
      }
    ];
    delete message.content;
  }

  return message;
});

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

  const lastUserIndex = INITIAL_MESSAGES.reduce((lastIdx, msg, idx) => {
    return msg.role === "user" ? idx : lastIdx;
  }, -1);

  return (
    <div className="gemini-app-container">
      <Sidebar />
      <div className="gemini-main-content">
        <header className="gemini-header">
          <div className="header-left">
            <h1 className="logo-text">Gemini</h1>
          </div>
          <div className="header-center">
            <div className="chat-title">Hệ thống Phân tích Virtual Engine</div>
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
            followOutput={true}
            initialScrollIndex={lastUserIndex}
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
