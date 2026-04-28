import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatInput,
  type ChatInputHandle,
  ChatMessage,
  GeminiSparkle,
  ReactVirtualChatbot,
  ReactVirtualChatbotHandle,
  UniversalChatRow,
} from "react-virtual-chatbot";
import "./App.css";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Chào bạn! Tôi đã kết nối với OpenRouter. Bạn có thể chọn bất kỳ model nào (GPT-4, Claude, Gemini...) để trò chuyện nhé!",
  }
];

interface ModelInfo {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

interface PendingFile {
  file: File;
  preview: string;
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
  const [apiKey, setApiKey] = useState("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");
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  
  const chatbotRef = useRef<ReactVirtualChatbotHandle<ChatMessage>>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const activeAiIdxRef = useRef(-1);

  // Fetch OpenRouter Models
  useEffect(() => {
    if (!apiKey) return;
    fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Virtual Chatbot"
      }
    })
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          const models: ModelInfo[] = data.data.map((m: any) => ({
            id: m.id,
            name: m.name || m.id,
            desc: m.description || "OpenRouter Model",
            icon: m.id.includes("gpt") ? "🤖" : m.id.includes("claude") ? "🧠" : m.id.includes("gemini") ? "✨" : "🌟"
          }));
          setAvailableModels(models);
          if (models.length > 0) {
            setSelectedModel(prev => models.find(m => m.id === prev?.id) || models.find(m => m.id.includes("google/gemini-2.0-flash-lite:free")) || models[0]);
          }
        }
      })
      .catch(e => console.error("Lỗi lấy model OpenRouter:", e));
  }, [apiKey]);

  const handleFileSelect = (file: File) => {
    const preview = URL.createObjectURL(file);
    setPendingFile({ file, preview });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSend = useCallback(async (text: string) => {
    const chatbot = chatbotRef.current;
    if (!chatbot || !apiKey || !selectedModel) return;

    if (activeAiIdxRef.current !== -1) {
      chatbot.patchMetadata(activeAiIdxRef.current, { minHeight: null, isLoading: false });
    }

    let userMessageContent: any = text;
    let visualContent = text;
    let base64Image = "";

    if (pendingFile) {
      try {
        base64Image = await fileToBase64(pendingFile.file);
        visualContent = `![image](${pendingFile.preview})\n\n${text}`;
        userMessageContent = [
          { type: "text", text },
          { 
            type: "image_url", 
            image_url: { url: `data:${pendingFile.file.type};base64,${base64Image}` } 
          }
        ];
      } catch (e) {
        console.error("Lỗi xử lý ảnh:", e);
      }
    }

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: visualContent };
    const aiMsg: ChatMessage = { 
      id: `a-${Date.now()}`, 
      role: "assistant", 
      content: "...", 
      metadata: { minHeight: "80vh", isLoading: true } 
    };

    chatbot.appendItems([userMsg, aiMsg], false);
    const aiIdx = chatbot.getTotalCount() - 1;
    chatbot.updateItemHeight(aiIdx, window.innerHeight * 0.8);
    chatbot.scrollToIndex(aiIdx - 1);
    activeAiIdxRef.current = aiIdx;

    const currentPendingFile = pendingFile;
    setPendingFile(null); 

    try {
      inputRef.current?.setStreaming(true);
      
      const messages = [
        { role: "user", content: userMessageContent }
      ];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Virtual Chatbot"
        },
        body: JSON.stringify({
          model: selectedModel.id,
          messages: messages,
          stream: true
        })
      });

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
          if (line.trim() === "") continue;
          if (line.trim() === "data: [DONE]") break;
          
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.substring(6));
              const content = json.choices?.[0]?.delta?.content || "";
              fullText += content;
              if (fullText) {
                chatbot.updateMessageText(aiIdx, fullText);
              }
            } catch (e) {
              // Một số chunk có thể không phải JSON hoàn chỉnh
            }
          }
        }
      }
    } catch (error: any) {
      chatbot.updateMessageText(aiIdx, `❌ Lỗi: ${error.message}`);
    } finally {
      inputRef.current?.setStreaming(false);
      chatbot.patchMetadata(aiIdx, { minHeight: null, isLoading: false });
      activeAiIdxRef.current = -1;
      if (currentPendingFile) URL.revokeObjectURL(currentPendingFile.preview);
    }
  }, [apiKey, selectedModel, pendingFile]);

  const renderMessage = useCallback((item: ChatMessage | null, index: number) => {
    if (item?.role === "assistant") {
      return (
        <div key={item.id} className="assistant-message-wrapper">
          <div className="ai-message-prefix">
            <GeminiSparkle isLoading={item.metadata?.isLoading} />
          </div>
          <UniversalChatRow item={item} />
        </div>
      );
    }
    return <UniversalChatRow key={item?.id || index} item={item} />;
  }, []);

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
                placeholder="Dán OpenRouter API Key vào đây..." 
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
            onFileSelect={handleFileSelect}
            onRemoveFile={() => setPendingFile(null)}
            selectedFileUrl={pendingFile?.preview}
            availableModels={availableModels}
            selectedModelId={selectedModel?.id}
            onModelSelect={(model) => setSelectedModel(model as any)}
          />
        </footer>
      </div>
    </div>
  );
}

export default App;
