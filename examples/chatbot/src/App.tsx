import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatInput,
  type ChatInputHandle,
  ChatMessage,
  ReactVirtualChatbot,
  ReactVirtualChatbotHandle,
  UniversalChatRow,
} from "react-virtual-chatbot";
import "./App.css";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Chào bạn! Tôi là Gemini 2.5 Flash. Bạn muốn tôi giúp gì hôm nay?",
  }
];

const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar-top">
      <div className="sidebar-icon" title="Main Menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </div>
    </div>
  </aside>
);

function App() {
  const [apiKey, setApiKey] = useState("AIzaSyCX8Rt2cmtl1TSuAeLBHgxJweqqO2z9fC0");
  const chatbotRef = useRef<ReactVirtualChatbotHandle<ChatMessage>>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const activeAiIdxRef = useRef(-1);

  // Tự động log danh sách model khi khởi chạy
  useEffect(() => {
    if (!apiKey) return;
    fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
      .then(r => r.json())
      .then(data => console.log("🚀 Models khả dụng:", data.models?.map((m: any) => m.name)))
      .catch(e => console.error("Lỗi quét model:", e));
  }, [apiKey]);

  const handleSend = useCallback(async (text: string) => {
    const chatbot = chatbotRef.current;
    if (!chatbot || !apiKey) return;

    if (activeAiIdxRef.current !== -1) {
      chatbot.patchMetadata(activeAiIdxRef.current, { minHeight: null });
    }

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: "assistant", content: "...", metadata: { minHeight: "80vh" } };

    chatbot.appendItems([userMsg, aiMsg], false);
    const aiIdx = chatbot.getTotalCount() - 1;
    
    chatbot.updateItemHeight(aiIdx, window.innerHeight * 0.8);
    chatbot.scrollToIndex(aiIdx - 1);
    activeAiIdxRef.current = aiIdx;

    try {
      inputRef.current?.setStreaming(true);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text }] }] })
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Không thể đọc luồng dữ liệu.");

      let fullText = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.substring(6));
              fullText += json.candidates?.[0]?.content?.parts?.[0]?.text || "";
              chatbot.updateMessageText(aiIdx, fullText);
            } catch (e) {}
          }
        }
      }
    } catch (error: any) {
      chatbot.updateMessageText(aiIdx, `❌ Lỗi: ${error.message}`);
    } finally {
      inputRef.current?.setStreaming(false);
      chatbot.patchMetadata(aiIdx, { minHeight: null });
      activeAiIdxRef.current = -1;
    }
  }, [apiKey]);

  const renderMessage = useCallback((item: ChatMessage | null, index: number) => (
    <UniversalChatRow key={item?.id || index} item={item} />
  ), []);

  return (
    <div className="gemini-app-container">
      <Sidebar />
      <div className="gemini-main-content">
        <header className="gemini-header">
          <div className="header-left"><h1 className="logo-text">Gemini</h1></div>
          <div className="header-center">
            <div className="api-key-input-wrapper">
              <input 
                type="password" 
                placeholder="Dán API Key vào đây..." 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="api-key-input"
              />
            </div>
          </div>
          <div className="header-right"><div className="user-pill">Le</div></div>
        </header>

        <main className="gemini-main">
          <ReactVirtualChatbot
            ref={chatbotRef}
            items={INITIAL_MESSAGES}
            renderItem={renderMessage}
            itemHeight={100}
            followOutput={true}
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
