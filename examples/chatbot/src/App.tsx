import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  IVirtualChatRowHandle,
  ReactVirtualChatbot,
  ReactVirtualChatbotHandle,
  setTextNode,
} from "react-virtual-chatbot";
import "./App.css";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const TOPICS = [
  "Hello there!",
  "How can I help you today?",
  "I'm a high-performance virtualized chatbot engine.",
  "Check out how smoothly I scroll with thousands of messages. No React re-renders, just pure DOM speed!",
  "Virtualization is key for large data sets. We only render what you see.",
  "This message is testing fixed-height slots and content patterns. It's important to maintain performance while delivering a rich UI experience.",
  "Speed, Efficiency, Reliability.",
  "React + Imperative DOM = 🚀",
  "The weather in the digital realm is always sunny and full of bits.",
  "Did you know that virtualization can reduce memory usage by up to 90% in large lists?",
  "I'm thinking about the future of web development. It looks fast!",
  "Let's explore the possibilities of low-latency streaming text.",
  "Every byte counts when you're aiming for 60fps.",
  "Debugging is like being a detective in a crime movie where you are also the murderer.",
  "Coffee is the fuel for many developers, but I run on pure electricity.",
];

const INITIAL_MESSAGES: Message[] = Array.from({ length: 1000 }, (_, i) => {
  const sentenceCount = 3 + (i % 3);
  const sentences = Array.from(
    { length: sentenceCount },
    (_, j) => TOPICS[(i + j) % TOPICS.length],
  );
  const baseText = sentences.join(" ");

  const decorations = [" ✨", " 🚀", " 🌟", "!", "..."];
  const decoration = i % 3 === 0 ? decorations[i % decorations.length] : "";

  return {
    id: `msg-${i}`,
    text: baseText + decoration,
    sender: i % 2 === 0 ? "user" : "bot",
    timestamp: new Date(Date.now() - (1000 - i) * 60000), // Staggered timestamps
  };
});

const parseMarkdown = (text: string) => {
  if (!text) return "";
  // Escape HTML for security, then parse specific markdown
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
    .replace(/`(.*?)`/g, "<code>$1</code>") // Inline code
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("* ")) {
        return `<li>${trimmed.substring(2)}</li>`;
      }
      return trimmed ? `<p>${trimmed}</p>` : "";
    })
    .join("");

  // Wrap contiguous <li> groups into <ul>
  html = html.replace(/(<li>.*?<\/li>)+/g, "<ul>$&</ul>");
  return html;
};

const GeminiIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 0L14.59 7.41L22 10L14.59 12.59L12 20L9.41 12.59L2 10L9.41 7.41L12 0Z"
      fill="url(#gemini-grad)"
    />
    <defs>
      <linearGradient
        id="gemini-grad"
        x1="2"
        y1="0"
        x2="22"
        y2="20"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#4B90FF" />
        <stop offset="0.5" stopColor="#FF5546" />
        <stop offset="1" stopColor="#9176FF" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Optimized message row component that supports pure imperative updates via DOM.
 * React only renders the initial shell once. All data swaps happen via refs.
 */
const MessageRow = forwardRef<
  IVirtualChatRowHandle<Message>,
  { msg: Message | null; index: number }
>(({ msg: initialMsg, index: initialIndex }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null); // For Bot
  const userTextRef = useRef<HTMLDivElement>(null); // For User

  useImperativeHandle(ref, () => ({
    update: (item, index, element, isVisible) => {
      if (!containerRef.current) return;

      const botEl = containerRef.current.querySelector(
        ".bot-layout-wrapper",
      ) as HTMLElement;
      const userEl = containerRef.current.querySelector(
        ".message-bubble.user",
      ) as HTMLElement;

      if (!item) {
        if (botEl) botEl.style.display = "none";
        if (userEl) userEl.style.display = "none";
        return;
      }

      const isBot = item.sender === "bot";
      containerRef.current.className = `message-row-container ${item.sender}`;

      if (botEl) botEl.style.display = isBot ? "flex" : "none";
      if (userEl) userEl.style.display = isBot ? "none" : "block";

      if (isBot) {
        const thinkingEl = containerRef.current.querySelector(".thinking-icon-wrapper") as HTMLElement;
        const staticSparkle = containerRef.current.querySelector(".static-sparkle") as HTMLElement;
        
        if (!item.text) {
          if (thinkingEl) thinkingEl.style.display = "block";
          if (staticSparkle) staticSparkle.style.display = "none";
          if (textRef.current) textRef.current.style.display = "none";
        } else {
          if (thinkingEl) thinkingEl.style.display = "none";
          if (staticSparkle) staticSparkle.style.display = "block";
          if (textRef.current) {
            textRef.current.style.display = "block";
            textRef.current.innerHTML = parseMarkdown(item.text);
          }
        }
      } else {
        if (userTextRef.current) setTextNode(userTextRef.current, item.text);
      }
    },
    updateText: (text) => {
      // During streaming, instantly hide the thinking icon and restore static layout
      const thinkingEl = containerRef.current?.querySelector(".thinking-icon-wrapper") as HTMLElement;
      const staticSparkle = containerRef.current?.querySelector(".static-sparkle") as HTMLElement;
      
      if (thinkingEl) thinkingEl.style.display = "none";
      if (staticSparkle) staticSparkle.style.display = "block";
      
      if (textRef.current) {
        textRef.current.style.display = "block";
        textRef.current.innerHTML = parseMarkdown(text);
      }
    },
  }));

  return (
    <div
      ref={containerRef}
      className="message-row-container bot"
      style={{ display: "flex", width: "100%", position: "relative" }}
    >
      {/* Bot Layout Shell - Hidden by default */}
      <div
        className="bot-layout-wrapper"
        style={{
          display: "none",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: "16px",
          width: "100%",
          padding: "16px 0",
        }}
      >
        <div className="bot-avatar" style={{ flexShrink: 0, marginTop: "2px" }}>
          <svg
            className="static-sparkle"
            width="24"
            height="24"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 4L18.59 13.41L28 16L18.59 18.59L16 28L13.41 18.59L4 16L13.41 13.41L16 4Z"
              fill="#3B82F6"
            />
          </svg>
          <div className="thinking-icon-wrapper" style={{ display: "none" }}>
            <GeminiThinkingIcon />
          </div>
        </div>
        
        <div className="bot-message-body" style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, minWidth: 0 }}>
          <div className="bot-content">
            <div ref={textRef} className="message-text"></div>
          </div>
          
          <div className="bot-actions" style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--text-secondary)", marginTop: "8px" }}>
            <button className="icon-btn tooltip" aria-label="Good response">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
            </button>
            <button className="icon-btn tooltip" aria-label="Bad response">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
              </svg>
            </button>
            <button className="icon-btn tooltip" aria-label="Reload">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
            </button>
            <button className="icon-btn tooltip" aria-label="Copy">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button className="icon-btn tooltip" aria-label="More">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* User Layout Shell - Hidden by default */}
      <div
        className="message-bubble user"
        style={{ display: "none", margin: "12px 0" }}
      >
        <div ref={userTextRef}></div>
      </div>
    </div>
  );
});

interface ChatInputHandle {
  setDisabled: (disabled: boolean) => void;
  setThinking: (thinking: boolean) => void;
}

const ChatInput = React.memo(
  forwardRef<ChatInputHandle, { onSend: (text: string) => void }>(
    ({ onSend }, ref) => {
      const inputRef = useRef<HTMLInputElement>(null);

      useImperativeHandle(ref, () => ({
        setDisabled: (v) => {
          if (inputRef.current) inputRef.current.disabled = v;
        },
        setThinking: (v) => {},
      }));

      const handleSend = () => {
        if (!inputRef.current) return;
        const text = inputRef.current.value;
        if (text.trim() && !inputRef.current.disabled) {
          onSend(text);
          inputRef.current.value = ""; // Imperative clear
        }
      };

      return (
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <input
              ref={inputRef}
              className="chat-input-field"
              placeholder="Ask Gemini"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />

            <div className="chat-input-actions-row">
              <div className="input-left-group">
                <button className="input-action-btn" title="Add">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 5V19M5 12H19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="model-pill-selector">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77Z" />
                  </svg>
                  Tools
                </div>
              </div>

              <div className="input-right-group">
                <div className="model-pill-selector">
                  Fast
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <button className="input-action-btn mic-btn">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M19 10v2a7 7 0 0 1-14 0v-2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
                <button
                  className="input-action-btn send-btn"
                  onClick={handleSend}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22 2L15 22L11 13L2 9L22 2Z"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="disclaimer-text">
            Gemini is AI and can make mistakes.
          </div>
        </div>
      );
    },
  ),
);

const GeminiThinkingIcon = () => (
  <div className="v-bolt-thinker">
    <div className="v-bolt-ring" />
    <div className="v-bolt-icon">
      <svg
        width="24"
        height="24"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M17 4L19.59 13.41L29 16L19.59 18.59L17 28L14.41 18.59L5 16L14.41 13.41L17 4Z"
          fill="var(--accent-blue)"
        />
      </svg>
    </div>
  </div>
);

const Sidebar = ({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) => (
  <aside className={`sidebar ${isExpanded ? "expanded" : "collapsed"}`}>
    <button
      className="sidebar-toggle-btn"
      onClick={onToggle}
      title="Collapse menu"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 12H21M3 6H21M3 18H21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>

    <button className="new-chat-btn">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {isExpanded && <span>New chat</span>}
    </button>

    <div className="history-section">
      <div className="history-group">
        {isExpanded && <div className="history-title">Notebooks</div>}
        <div className="history-item">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 5V19M5 12H19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isExpanded && <span>New notebook</span>}
        </div>
      </div>

      <div className="history-group">
        {isExpanded && <div className="history-title">Chats</div>}
        <div className="history-item active">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          {isExpanded && <span>Lỗi logic ID biên trong lập trình</span>}
        </div>
        <div className="history-item">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          {isExpanded && <span>Tiếng Anh IT Cho Phóng Vấn</span>}
        </div>
      </div>
    </div>

    <div style={{ marginTop: "auto" }}>
      <div className="history-item">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {isExpanded && <span>Settings and help</span>}
      </div>
    </div>
  </aside>
);

const ModelHeader = () => (
  <header className="model-header">
    <div className="header-left">
      <span>Gemini</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 9L12 15L18 9"
          stroke="var(--text-secondary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>

    <div className="header-title">Lỗi logic ID biên trong lập trình</div>

    <div className="header-actions">
      <button className="upgrade-plus-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.59 7.41L22 10L14.59 12.59L12 20L9.41 12.59L2 10L9.41 7.41L12 2Z" />
        </svg>
        Upgrade to Google AI Plus
      </button>
      <div className="input-action-btn">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="9" cy="12" r="1" stroke="currentColor" strokeWidth="2" />
          <circle cx="15" cy="12" r="1" stroke="currentColor" strokeWidth="2" />
          <circle cx="21" cy="12" r="1" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <div className="user-profile">V</div>
    </div>
  </header>
);

function App() {
  const chatbotRef = useRef<ReactVirtualChatbotHandle<Message>>(null);
  const inputRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(400);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const activeIntervalRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Dynamically measure viewport height to fill remaining space
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
    console.log("[handleSend] Triggered with text:", text);
    
    // 0. Prevent overlapping rapid submissions anywhere in the pipeline
    if (isProcessingRef.current) {
      console.warn("[handleSend] Blocked overlapping execution. Pipeline is already processing.");
      return;
    }
    
    isProcessingRef.current = true;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: "user",
      timestamp: new Date(),
    };

    // 1. ADD MESSAGES IMPERATIVELY IN BATCH (Avoid disjointed layouts)
    const currentTotal = chatbotRef.current?.getTotalCount() || 0;
    console.log("[handleSend] Current engine total count:", currentTotal);
    
    const botMessage: Message = {
      id: `msg-bot-${Date.now()}`,
      text: "",
      sender: "bot",
      timestamp: new Date(),
    };

    // Append both synchronously and force scroll to evaluate the whole boundary
    chatbotRef.current?.appendItems([newMessage, botMessage], true);
    
    // The bot's exact index is the OLD length + 1 (since user is OLD length)
    const actualBotIndex = currentTotal + 1;
    console.log("[handleSend] Calculated actualBotIndex:", actualBotIndex);

    inputRef.current?.setDisabled(true);
    inputRef.current?.setThinking(true);

    // 4. SIMULATE THINKING DELAY THEN START STREAMING
    console.log("[handleSend] Setting timeout for simulated delay...");
    setTimeout(() => {
      console.log("[handleSend] Timeout resolved! Starting stream.");
      const getRandom = (arr: string[]) =>
        arr[Math.floor(Math.random() * arr.length)];

      const responsePrefixes = [
        "That's an interesting point! ",
        "Certainly, I can help with that. Here is a more detailed breakdown: ",
        "Based on what you've said, I've compiled some findings. ",
        "Interestingly, the data suggests multiple layers to this. ",
        "I've analyzed your input and generated a comprehensive overview. ",
      ];

      const sentenceCount = 5 + Math.floor(Math.random() * 6);
      const sentences = Array.from({ length: sentenceCount }, () =>
        getRandom(TOPICS),
      );
      const fullText = `${getRandom(responsePrefixes)}${sentences.join(" ")}`;

      // 5. STREAM INTO THE SLOT WE JUST CREATED
      const words = fullText.split(" ");
      let currentIdx = 0;

      if (activeIntervalRef.current)
        window.clearInterval(activeIntervalRef.current);

      const intervalId = window.setInterval(
        () => {
          if (currentIdx >= words.length) {
            window.clearInterval(intervalId);
            activeIntervalRef.current = null;
            isProcessingRef.current = false;
            inputRef.current?.setDisabled(false);
            inputRef.current?.setThinking(false);

            // Force final update to permanently save the completed text
            chatbotRef.current?.updateItem(actualBotIndex, {
              ...botMessage,
              text: fullText,
            });
            return;
          }

          const currentText = words.slice(0, currentIdx + 1).join(" ");

        // Mutate the local object so if the row recycles MID-STREAM it remembers its text
        botMessage.text = currentText;

        chatbotRef.current?.updateMessageText(actualBotIndex, currentText);

        currentIdx++;
      },
      30 + Math.random() * 40,
    );

      activeIntervalRef.current = intervalId;
    }, 1200);
  }, []);

  const renderMessage = useCallback((msg: Message | null, index: number) => {
    return <MessageRow msg={msg} index={index} />;
  }, []);

  return (
    <div className="workspace-layout">
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />

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
            renderTypingIndicator={() => <GeminiThinkingIcon />}
          />
        </div>

        <ChatInput onSend={handleSend} />
      </main>
    </div>
  );
}

export default App;
