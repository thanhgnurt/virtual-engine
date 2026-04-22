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
  "This is a longer message designed to test how the fixed-height slot handles content overflow and multi-line bubbles in a virtual list. It still needs to fit within our 100px row height for this baseline demo, otherwise we would need dynamic height calculations.",
  "Speed, Efficiency, Reliability.",
  "React + Imperative DOM = 🚀",
];

const INITIAL_MESSAGES: Message[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `msg-${i}`,
  text:
    TOPICS[i % TOPICS.length] +
    (i % 5 === 0 ? " Extra detail for variety! 🌟" : ""),
  sender: i % 2 === 0 ? "user" : "bot",
  timestamp: new Date(),
}));

/**
 * Optimized message row component that supports pure imperative updates via DOM.
 * React only renders the initial shell once. All data swaps happen via refs.
 */
const MessageRow = forwardRef<
  IVirtualChatRowHandle<Message>,
  { msg: Message | null; index: number }
>(({ msg: initialMsg, index: initialIndex }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const senderRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  useImperativeHandle(ref, () => ({
    update: (item, index, element, isVisible) => {
      if (!item || !containerRef.current) return;

      // 1. Swap Sender Class (for layout/styling)
      containerRef.current.className = `message-container ${item.sender}`;

      // 2. Update Sender Text
      if (senderRef.current) {
        senderRef.current.textContent = item.sender === "user" ? "You" : "AI";
      }

      // 3. Update Message Text (High Perf DOM)
      if (textRef.current) {
        setTextNode(textRef.current, item.text);
      }

      // 4. Update Time
      if (timeRef.current) {
        timeRef.current.textContent = item.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    },
    updateText: (text) => {
      if (textRef.current) setTextNode(textRef.current, text);
    },
  }));

  // Initial render setup: Always render the full shell structure.
  // The parent Engine (ReactVirtualChatbot) handles hiding/showing the entire slot
  // via direct DOM visibility/positioning on the wrapper.
  return (
    <div
      ref={containerRef}
      className={`message-container ${initialMsg?.sender || "bot"}`}
    >
      <div className="message-bubble">
        <div ref={textRef} className="message-text">
          {initialMsg?.text || ""}
        </div>
        <div className="message-info">
          <span ref={senderRef} className="message-sender">
            {initialMsg ? (initialMsg.sender === "user" ? "You" : "AI") : ""}
          </span>
          <span ref={timeRef} className="message-time">
            {initialMsg
              ? initialMsg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
});

interface ChatInputHandle {
  setDisabled: (disabled: boolean) => void;
}

/**
 * Isolated input component that uses direct DOM access to prevent re-rendering the entire App.
 */
const ChatInput = React.memo(
  forwardRef<ChatInputHandle, { onSend: (text: string) => void }>(
    ({ onSend }, ref) => {
      const inputRef = useRef<HTMLInputElement>(null);
      const buttonRef = useRef<HTMLButtonElement>(null);

      useImperativeHandle(ref, () => ({
        setDisabled: (disabled: boolean) => {
          // if (inputRef.current) inputRef.current.disabled = disabled;
          // if (buttonRef.current) {
          //   buttonRef.current.disabled = disabled;
          //   buttonRef.current.style.opacity = disabled ? "0.5" : "1";
          //   buttonRef.current.style.cursor = disabled ? "not-allowed" : "pointer";
          // }
        },
      }));

      const handleSend = () => {
        const val = inputRef.current?.value || "";
        if (val.trim()) {
          onSend(val);
          if (inputRef.current) inputRef.current.value = "";
        }
      };

      return (
        <footer className="chat-input-area">
          <input
            ref={inputRef}
            type="text"
            onKeyPress={(e) =>
              e.key === "Enter" && !inputRef.current?.disabled && handleSend()
            }
            placeholder="Type a message..."
            className="chat-input"
          />
          <button
            ref={buttonRef}
            onClick={handleSend}
            className="send-button"
            title="Send message"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </footer>
      );
    },
  ),
);

function App() {
  const [messages] = useState<Message[]>(INITIAL_MESSAGES);
  const chatbotRef = useRef<ReactVirtualChatbotHandle>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(400);

  // Maintain local count for DOM-based stats update
  const messageCountRef = useRef(INITIAL_MESSAGES.length);

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
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: "user",
      timestamp: new Date(),
    };

    // 1. ADD MESSAGE IMPERATIVELY (Avoid React Re-render)
    chatbotRef.current?.appendItems([newMessage], true);

    // 2. SHOW TYPING INDICATOR & LOCK INPUT
    chatbotRef.current?.setTyping(true);
    inputRef.current?.setDisabled(true);

    // 3. UPDATE STATS DOM (Avoid React Re-render)
    messageCountRef.current += 1;
    if (statsRef.current) {
      statsRef.current.textContent = `Total Messages: ${messageCountRef.current}`;
    }

    // 4. SIMULATE BOT RESPONSE
    setTimeout(() => {
      // HIDE TYPING INDICATOR & UNLOCK INPUT
      chatbotRef.current?.setTyping(false);
      inputRef.current?.setDisabled(false);

      const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      const botMessage: Message = {
        id: `msg-bot-${Date.now()}`,
        text: `AI says: ${randomTopic} (Response to: ${text})`,
        sender: "bot",
        timestamp: new Date(),
      };

      chatbotRef.current?.appendItems([botMessage]);

      messageCountRef.current += 1;
      if (statsRef.current) {
        statsRef.current.textContent = `Total Messages: ${messageCountRef.current}`;
      }
    }, 1000);
  }, []);

  const renderMessage = useCallback((msg: Message | null, index: number) => {
    return <MessageRow msg={msg} index={index} />;
  }, []);

  return (
    <div className="app-container">
      <header className="chat-header">
        <h1>Virtual Chatbot Demo</h1>
        <p>A high-performance fixed-height virtualized chat list.</p>
      </header>

      <div ref={viewportRef} className="chat-viewport">
        <ReactVirtualChatbot
          ref={chatbotRef}
          items={messages}
          itemHeight={100}
          height={viewportHeight}
          renderItem={renderMessage}
          className="virtual-chatbot-list"
          followOutput={true}
        />
      </div>

      <ChatInput ref={inputRef} onSend={handleSend} />

      <div ref={statsRef} className="stats">
        Total Messages: {messageCountRef.current}
      </div>
    </div>
  );
}

export default App;
