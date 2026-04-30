import { IChatFetcher } from "../worker/types";
import { BaseStore } from "./core/BaseStore";
import { HistoryModule } from "./modules/data/HistoryModule";
import { PersistModule } from "./modules/data/PersistModule";
import { WorkerModule } from "./modules/infra/WorkerModule";
import { ComponentRegistryModule } from "./modules/ui/ComponentRegistryModule";
import { ContentRegistryModule } from "./modules/ui/ContentRegistryModule";
import { LayoutModule } from "./modules/ui/LayoutModule";
import { DOMRegisterModule } from "./modules/ui/DOMRegisterModule";
import { ResizeModule } from "./modules/ui/ResizeModule";
import { SyncModule } from "./modules/ui/SyncModule";
import { VirtualModule } from "./modules/ui/VirtualModule";
import { ScrollModule } from "./modules/ui/ScrollModule";
import { UIStatusModule } from "./modules/ui/UIStatusModule";
import { StreamModule } from "./modules/ui/StreamModule";
import { ChatEvent, ChatState } from "./types";

export interface ChatStoreOptions {
  worker?: Worker;
  fallbackFetcher?: IChatFetcher;
  initialState?: Partial<ChatState>;
}

/**
 * The main ChatStore that orchestrates all chat-related logic.
 * Follows the modular architecture of MiniPriceBoard with Hybrid Worker support.
 */
export class ChatStore extends BaseStore<ChatState, ChatEvent> {
  // Modules
  public historyModule!: HistoryModule;
  public workerModule!: WorkerModule;
  public dom!: DOMRegisterModule;
  public contentRegistryModule!: ContentRegistryModule;
  public componentRegistryModule!: ComponentRegistryModule;
  public syncModule!: SyncModule;
  public layoutModule!: LayoutModule;
  public virtualModule!: VirtualModule;
  public resizeModule!: ResizeModule;
  public scrollModule!: ScrollModule;
  public uiStatusModule!: UIStatusModule;
  public streamModule!: StreamModule;

  constructor(options: ChatStoreOptions = {}) {
    const defaultState: ChatState = {
      history: [],
      isStreaming: false,
      selectedModelId: "google/gemini-2.0-pro-exp-02-05:free",
      apiKey: "",
      pendingFile: null,
      ...options.initialState,
    };

    super(defaultState);

    this._initModules(options);
  }

  private _initModules(options: ChatStoreOptions) {
    // 1. Data Layer
    this.historyModule = this.registerModule(new HistoryModule());
    this.registerModule(new PersistModule());

    // 2. Infra Layer (Hybrid Worker)
    this.workerModule = this.registerModule(
      new WorkerModule(options.worker, options.fallbackFetcher),
    );

    // 3. UI Layer
    this.dom = this.registerModule(new DOMRegisterModule());
    this.contentRegistryModule = this.registerModule(
      new ContentRegistryModule(),
    );
    this.componentRegistryModule = this.registerModule(
      new ComponentRegistryModule(),
    );
    this.syncModule = this.registerModule(new SyncModule());
    this.layoutModule = this.registerModule(new LayoutModule());
    this.virtualModule = this.registerModule(new VirtualModule());
    this.resizeModule = this.registerModule(new ResizeModule());
    this.scrollModule = this.registerModule(new ScrollModule());
    this.uiStatusModule = this.registerModule(new UIStatusModule());
    this.streamModule = this.registerModule(new StreamModule());
  }

  /**
   * Helper to send a message (High-level API)
   */
  public async sendMessage(content: string) {
    if (!content.trim() || this.state.isStreaming) return;

    const userMsg = { role: "user", content: content };
    const aiMsg = {
      role: "assistant",
      content: "",
      metadata: { isLoading: true },
    };

    // 1. Update History
    this.historyModule.appendMessages([userMsg, aiMsg] as any);
    const aiIdx = this.historyModule.getCount() - 1;

    // 2. Prepare Layout & Scroll (Ensure it's visible)
    this.layoutModule.calculateAndApplyMinHeight(aiIdx);
    this.uiStatusModule.setTyping(true);
    this.emit(ChatEvent.HISTORY_CHANGED); // Force one more update

    // 3. Start Streaming via Worker (or Fallback)
    try {
      const messages = this.state.history.map((h) => ({
        role: h.role,
        content: h.content,
      }));

      // The WorkerModule will emit ChatEvent.MESSAGE_UPDATED and STREAM_STATE_CHANGED
      await this.workerModule.startStream(aiIdx, {
        messages,
        modelId: this.state.selectedModelId,
        apiKey: this.state.apiKey,
      });

      // 4. Finalize
      this.historyModule.updateMessageMetadata(aiIdx, { isLoading: false });
    } catch (error) {
      this.historyModule.updateMessageMetadata(aiIdx, { isLoading: false });
    } finally {
      this.uiStatusModule.setTyping(false);
    }
  }

  /**
   * Updates the API key in the store
   */
  public setApiKey(key: string) {
    this._state.apiKey = key;
    this.emit(ChatEvent.CONFIG_CHANGED);
  }

  /**
   * Updates the selected model
   */
  public setSelectedModel(modelId: string) {
    this._state.selectedModelId = modelId;
    this.emit(ChatEvent.CONFIG_CHANGED);
  }
}

export * from "../worker/types";
export * from "./core/BaseModule";
export * from "./core/BaseStore";
export * from "./types";
