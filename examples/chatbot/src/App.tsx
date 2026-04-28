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
    content: "Chào bạn! Tôi đã quét danh sách model từ Key của bạn. Bạn có thể nhấn vào tên model bên dưới để thay đổi nhé!",
  }
];

interface ModelInfo {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

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
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const chatbotRef = useRef<ReactVirtualChatbotHandle<ChatMessage>>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const activeAiIdxRef = useRef(-1);

  // TỰ ĐỘNG QUÉT DANH SÁCH MODEL TỪ KEY
  useEffect(() => {
    if (!apiKey) return;
    fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
      .then(r => r.json())
      .then(data => {
        if (data.models) {
          const models: ModelInfo[] = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
            .map((m: any) => {
              const id = m.name.replace("models/", "");
              return {
                id,
                name: id.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(" "),
                desc: m.description || "Model từ tài khoản của bạn",
                icon: id.includes("pro") ? "🧠" : id.includes("flash") ? "⚡" : "✨"
              };
            });
          setAvailableModels(models);
          // Tự động chọn model đầu tiên nếu chưa chọn hoặc model cũ không còn
          if (models.length > 0) {
            setSelectedModel(prev => models.find(m => m.id === prev?.id) || models[0]);
          }
        }
      })
      .catch(e => console.error("Lỗi quét model:", e));
  }, [apiKey]);

  const handleSend = useCallback(async (text: string) => {
    const chatbot = chatbotRef.current;
    if (!chatbot || !apiKey || !selectedModel) return;

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
        `https://generativelanguage.googleapis.com/v1/models/${selectedModel.id}:streamGenerateContent?alt=sse&key=${apiKey}`,
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
  }, [apiKey, selectedModel]);

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
          <ChatInput 
            ref={inputRef} 
            onSend={handleSend} 
            onModelClick={() => setIsModalOpen(true)}
            modelName={selectedModel?.name || "Đang tải..."}
          />
        </footer>
      </div>

      {/* MODAL LỰA CHỌN MODEL ĐỘNG */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chọn phiên bản khả dụng</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="model-list">
              {availableModels.length === 0 ? (
                <div className="loading-models">Đang quét danh sách model...</div>
              ) : (
                availableModels.map(model => (
                  <div 
                    key={model.id} 
                    className={`model-item ${selectedModel?.id === model.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedModel(model);
                      setIsModalOpen(false);
                    }}
                  >
                    <div className="model-item-icon">{model.icon}</div>
                    <div className="model-item-info">
                      <div className="model-item-name">{model.name}</div>
                      <div className="model-item-desc">{model.desc}</div>
                    </div>
                    {selectedModel?.id === model.id && (
                      <div className="check-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a8c7fa" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
