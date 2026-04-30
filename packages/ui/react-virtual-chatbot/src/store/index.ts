import { IChatFetcher } from "../worker/types";
import { BaseStore } from "./core/BaseStore";
import { HistoryModule } from "./modules/data/HistoryModule";
import { PersistModule } from "./modules/data/PersistModule";
import { WorkerModule } from "./modules/infra/WorkerModule";
import { DOMRegisterModule } from "./modules/ui/DOMRegisterModule";
import { LayoutModule } from "./modules/ui/LayoutModule";
import { ResizeModule } from "./modules/ui/ResizeModule";
import { ScrollModule } from "./modules/ui/ScrollModule";
import { StreamModule } from "./modules/ui/StreamModule";
import { SyncModule } from "./modules/ui/SyncModule";
import { UIStatusModule } from "./modules/ui/UIStatusModule";
import { VirtualModule } from "./modules/ui/VirtualModule";
import { ChatEvent, ChatState } from "./types";

/** Single source of truth for the physical DOM slot pool size. */
export const DEFAULT_POOL_SIZE = 16;

export interface ChatStoreOptions {
  worker?: Worker;
  fallbackFetcher?: IChatFetcher;
  initialState?: Partial<ChatState>;
  poolSize?: number;
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
  public syncModule!: SyncModule;
  public layoutModule!: LayoutModule;
  public virtualModule!: VirtualModule;
  public resizeModule!: ResizeModule;
  public scrollModule!: ScrollModule;
  public uiStatusModule!: UIStatusModule;
  public streamModule!: StreamModule;

  /** Number of physical DOM slots. Must stay in sync with the React pool. */
  public poolSize: number = DEFAULT_POOL_SIZE;

  constructor(options: ChatStoreOptions = {}) {
    const defaultState: ChatState = {
      history: [],
      isStreaming: false,
      selectedModelId: "google/gemini-2.0-pro-exp-02-05:free",
      pendingFile: null,
      ...options.initialState,
    };

    super(defaultState);

    this.poolSize = options.poolSize ?? DEFAULT_POOL_SIZE;
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
