import { useCallback, useRef } from "react";
import {
  ChatInput,
  type ChatInputHandle,
  ChatMessage,
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

const COMPLEX_CODE_SNIPPETS: Array<{ lang: string; code: string }> = [
  {
    lang: "typescript",
    code: `/**
 * Advanced Virtual Scroll Engine Implementation
 * Optimized for high-density chat applications with dynamic row heights.
 * Version: 2.4.0-alpha
 */

export class VirtualChatEngine<T> {
  private readonly items: T[];
  private readonly offsets: number[];
  private readonly heights: Map<number, number>;
  private totalHeight: number = 0;
  private viewportHeight: number = 0;
  private bufferSize: number = 5;

  constructor(items: T[], estimatedHeight: number = 100) {
    this.items = items;
    this.heights = new Map();
    this.offsets = new Array(items.length + 1).fill(0);

    // Initial estimation pass for O(n) startup
    for (let i = 0; i < items.length; i++) {
      this.offsets[i + 1] = this.offsets[i] + estimatedHeight;
    }
    this.totalHeight = this.offsets[items.length];
  }

  /**
   * Calculates which items should be visible based on scroll position.
   * Uses binary search for O(log n) efficiency during high-speed scrolls.
   */
  public computeVisibleRange(scrollTop: number, viewHeight: number) {
    this.viewportHeight = viewHeight;

    let start = this.findNearestIndex(scrollTop);
    let end = this.findNearestIndex(scrollTop + viewHeight);

    // Apply buffer for smoother scrolling experience
    start = Math.max(0, start - this.bufferSize);
    end = Math.min(this.items.length - 1, end + this.bufferSize);

    return {
      start,
      end,
      totalHeight: this.totalHeight,
      offset: this.offsets[start]
    };
  }

  private findNearestIndex(targetOffset: number): number {
    let low = 0;
    let high = this.offsets.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.offsets[mid] === targetOffset) return mid;
      if (this.offsets[mid] < targetOffset) low = mid + 1;
      else high = mid - 1;
    }
    return Math.max(0, low - 1);
  }

  /**
   * Imperatively updates the measured height of a specific item.
   * Recalculates all subsequent offsets to ensure scroll accuracy.
   */
  public updateItemHeight(index: number, newHeight: number) {
    const oldHeight = this.heights.get(index) || (this.offsets[index + 1] - this.offsets[index]);
    if (Math.abs(oldHeight - newHeight) < 0.5) return; // Precision threshold

    this.heights.set(index, newHeight);
    const diff = newHeight - oldHeight;

    // Shift all subsequent offsets (Optimized loop)
    for (let i = index + 1; i < this.offsets.length; i++) {
      this.offsets[i] += diff;
    }

    this.totalHeight += diff;
  }

  public getTotalHeight() {
    return this.totalHeight;
  }

  public getOffsetForIndex(index: number): number {
    return this.offsets[index] || 0;
  }
}`,
  },
];

const LONG_TEXT_SAMPLES: string[] = [
  `### Tầm nhìn về Kỹ thuật Phần mềm hiện đại
Lập trình không chỉ là việc viết các dòng mã để máy tính thực hiện. Đó là một , bạn cần xây dựng một nền tảng vững chắc từ:

**1. Kiến trúc Hệ thống:** Hiểu rõ cách các thành phần tương tác với nhau, từ Microservices đến Serverless. Việc chọn đúng kiến trúc sẽ quyết định sự sống còn của sản phẩm khi mở rộng quy mô.
**2. Tối ưu hóa Hiệu năng:** Đây là nơi phân biệt giữa một ứng dụng thông thường và một sản phẩm xuất sắc. Chúng ta nói về việc giảm thiểu độ trễ, tối ưu hóa bộ nhớ và tận dụng tối đa tài nguyên phần cứng.
**3. Tư duy Giải quyết Vấn đề:** Mã nguồn có thể thay đổi, ngôn ngữ có thể lỗi thời, nhưng khả năng phân tích một bài toán phức tạp thành các phần nhỏ và giải quyết chúng một cách hiệu quả là kỹ năng tồn tại vĩnh cửu.

Trong tương lai, khi AI ngày càng can thiệp sâu vào việc viết code, vai trò của người kỹ sư sẽ chuyển dịch sang việc thiết kế hệ thống và kiểm soát chất lượng ở mức độ cao hơn.`,

  `### Chiến lược Tối ưu hóa Frontend ở quy mô lớn
Khi làm việc với các hệ thống có hàng triệu người dùng, mỗi miligiây đều có giá trị. Dưới đây là các chiến lược cốt lõi mà chúng tôi áp dụng cho Virtual Engine:

*   **Virtual Rendering:** Chỉ render những gì hiển thị trên Viewport. Kỹ thuật này giúp giảm 90% số lượng DOM node, từ đó giải phóng bộ nhớ cho trình duyệt.
*   **Imperative DOM Updates:** Thay vì dựa hoàn toàn vào cơ chế diff của React (vốn có chi phí nhất định), chúng ta can thiệp trực tiếp vào thuộc tính của DOM cho các tác vụ như cuộn hoặc cập nhật text thời gian thực.
*   **Zero-Allocation Strategies:** Trong các vòng lặp hiệu năng cao (như sự kiện scroll), chúng ta tránh tạo mới object hay mảng để giảm áp lực cho Garbage Collector, ngăn ngừa tình trạng "jank" (khựng hình).

Việc kết hợp các yếu tố này giúp ứng dụng đạt được chỉ số Core Web Vitals ở mức tối đa, mang lại trải nghiệm mượt mà ngay cả trên các thiết bị cấu hình thấp.`,

  `### Kỷ nguyên của Trí tuệ Nhân tạo và Ứng dụng Thực tế
Chúng ta đang sống trong thời điểm bùng nổ của các mô hình ngôn ngữ lớn (LLM). Tuy nhiên, thách thức không nằm ở việc gọi API, mà là ở cách chúng ta tích hợp chúng vào quy trình làm việc:

1. **RAG (Retrieval-Augmented Generation):** Kết hợp sức mạnh của LLM với dữ liệu riêng của doanh nghiệp để tạo ra các câu trả lời chính xác và có ngữ cảnh.
2. **Streaming Interface:** Người dùng không muốn chờ đợi. Việc triển khai giao diện nhả chữ theo thời gian thực (như chúng ta đang thấy ở đây) giúp giảm độ trễ cảm nhận (perceived latency) một cách đáng kể.
3. **Prompt Engineering:** Nghệ thuật giao tiếp with máy móc. Một prompt tốt có thể thay đổi hoàn toàn chất lượng đầu ra, tiết kiệm chi phí tính toán và thời gian xử lý.

Đừng coi AI là kẻ thay thế, hãy coi nó là một "cộng sự" siêu cấp giúp bạn giải phóng sức sáng tạo khỏi những tác vụ lặp đi lặp lại hàng ngày.`,

  `### Giải thuật Xử lý Data Stream trong Real-time
Dưới đây là một ví dụ chuyên sâu về cách xử lý luồng dữ liệu lớn mà không làm treo UI thread:

\x60\x60\x60typescript
/**
 * Stream Processor with backpressure support
 * Ensures smooth UI updates even with 10k+ updates/sec
 */
class StreamManager<T> {
  private buffer: T[] = [];
  private isProcessing = false;

  public push(item: T) {
    this.buffer.push(item);
    this.scheduleProcessing();
  }

  private scheduleProcessing() {
    if (this.isProcessing || this.buffer.length === 0) return;
    this.isProcessing = true;

    // Use requestIdleCallback to avoid blocking main thread
    requestIdleCallback((deadline) => {
      while (deadline.timeRemaining() > 1 && this.buffer.length > 0) {
        const batch = this.buffer.splice(0, 50);
        this.processBatch(batch);
      }
      this.isProcessing = false;
      this.scheduleProcessing();
    });
  }

  private processBatch(batch: T[]) {
    // Imperative update logic here
    console.log('Processing batch of size:', batch.length);
  }
}
\x60\x60\x60

Kỹ thuật này kết hợp giữa **Batching** và **Idle Scheduling**, cho phép ứng dụng vẫn phản hồi mượt mà với các thao tác của người dùng trong khi đang xử lý hàng triệu bản ghi dữ liệu phía sau.`,
];

const INITIAL_MESSAGES: ChatMessage[] = Array.from(
  { length: 10000 },
  (_, i) => {
    const isUser = i % 2 === 0;
    const dice = i % LONG_TEXT_SAMPLES.length;
    let content = LONG_TEXT_SAMPLES[dice];

    if (dice === 0) {
      content +=
        " " +
        "Phân tích độ phức tạp thời gian O(n log n) là rất quan trọng khi tối ưu hóa các giải thuật sắp xếp như Merge Sort hay Quick Sort trong các ứng dụng xử lý dữ liệu lớn.";
    }

    // Force the last item to be a beautifully structured long message for testing
    if (i === 9999) {
      content =
        `### BÀI PHÂN TÍCH CHUYÊN SÂU VỀ HỆ THỐNG VIRTUAL ENGINE (PHẦN MỞ RỘNG)

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

Hy vọng bài phân tích siêu dài này không chỉ giúp bạn hiểu rõ về "nội công" phía sau mà còn giúp chúng ta kiểm tra được khả năng chịu tải cực hạn của hệ thống render!`.repeat(
          2,
        );
    }

    const message: ChatMessage = {
      id: `msg-old-${i}`,
      role: isUser ? ("user" as const) : ("assistant" as const),
      content: content,
    };

    // Occasionally add an image to assistant messages for variety (but not for the last long one)
    if (!isUser && i % 15 === 0 && i !== 9999) {
      message.parts = [
        { type: "text", content: content },
        {
          type: "image",
          content: `https://picsum.photos/800/400?random=${i}`,
          metadata: { aspectRatio: "2 / 1" },
        },
      ];
      delete message.content;
    }

    return message;
  },
);

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
    
    // Scroll the NEW user message to the top
    chatbot.scrollToIndex(userIdx);
    activeAiIdxRef.current = aiIdx;

    const rand = Math.random();
    let fullText = "";

    if (rand < 0.33) {
      // Technical Analysis
      fullText = `### Phân tích chuyên sâu cho yêu cầu: "${text}"\n\n${LONG_TEXT_SAMPLES[0]}\n\n${LONG_TEXT_SAMPLES[1]}`;
    } else if (rand < 0.66) {
      // Performance Comparison Table
      fullText = `Dưới đây là bảng so sánh hiệu năng liên quan đến "${text}":

| Chỉ số | Giải pháp AI hiện tại | Virtual Engine Optim | Ghi chú |
| :--- | :---: | :---: | :--- |
| Latency | ~120ms | **~45ms** | Giảm 62% độ trễ |
| Memory | 250MB | **18MB** | Tối ưu hóa Heap |
| GC Pressure | Cao | **Cực thấp** | Không gây giật lag |
| FPS | 45-50 | **60 stable** | Trải nghiệm mượt mà |

${LONG_TEXT_SAMPLES[2]}`;
    } else {
      // Complex Code Snippet
      const snippet = COMPLEX_CODE_SNIPPETS[0];
      fullText = `Để xử lý yêu cầu "${text}", tôi đề xuất kiến trúc sau đây bằng ${snippet.lang}:\n\n\`\`\`${snippet.lang}\n${snippet.code}\n\`\`\`\n\nKiến trúc này giúp tối ưu hóa luồng dữ liệu và đảm bảo tính mở rộng cho hệ thống của bạn.`;
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
