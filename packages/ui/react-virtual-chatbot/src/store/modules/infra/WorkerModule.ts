import { BaseModule } from '../../core/BaseModule';
import { ChatEvent } from '../../types';
import { IChatFetcher, WorkerMessage, WorkerMessageType } from '../../../worker/types';

/**
 * Manages the Web Worker and provides a fallback to Main Thread if necessary.
 */
export class WorkerModule extends BaseModule<any, ChatEvent> {
  private worker: Worker | null = null;
  private fallbackFetcher: IChatFetcher | null = null;
  private currentAbortController: AbortController | null = null;

  private isWorkerFailed: boolean = false;

  constructor(worker?: Worker, fallbackFetcher?: IChatFetcher) {
    super();
    this.worker = worker || null;
    this.fallbackFetcher = fallbackFetcher || null;
  }

  public override onInit(): void {
    if (this.worker) {
      this.worker.onerror = (err) => {
        console.error("Worker failed, falling back to Main Thread:", err);
        this.isWorkerFailed = true;
      };

      this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const { type, id, payload } = e.data;
        
        switch (type) {
          case WorkerMessageType.STREAM_CHUNK:
            this.store.emit(ChatEvent.MESSAGE_UPDATED, id, payload);
            break;
          case WorkerMessageType.STREAM_DONE:
            this.store.state.isStreaming = false;
            this.store.emit(ChatEvent.STREAM_STATE_CHANGED, id, false);
            break;
          case WorkerMessageType.STREAM_ERROR:
            this.store.emit(ChatEvent.MESSAGE_UPDATED, id, `❌ Error: ${payload}`);
            this.store.state.isStreaming = false;
            this.store.emit(ChatEvent.STREAM_STATE_CHANGED, id, false);
            break;
        }
      };
    }
  }

  public async startStream(id: number, params: any): Promise<void> {
    this.store.state.isStreaming = true;
    this.store.emit(ChatEvent.STREAM_STATE_CHANGED, id, true);

    if (this.worker && !this.isWorkerFailed) {
      // Use Worker Path
      this.worker.postMessage({
        type: WorkerMessageType.START_STREAM,
        id,
        payload: params
      });
    } else if (this.fallbackFetcher) {
      // Use Fallback Path (Main Thread)
      try {
        if (this.currentAbortController) this.currentAbortController.abort();
        this.currentAbortController = new AbortController();

        const stream = await this.fallbackFetcher.fetchStream(params);
        for await (const chunk of stream) {
          this.store.emit(ChatEvent.MESSAGE_UPDATED, id, chunk);
        }
        this.store.state.isStreaming = false;
        this.store.emit(ChatEvent.STREAM_STATE_CHANGED, id, false);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        this.store.emit(ChatEvent.MESSAGE_UPDATED, id, `❌ Error: ${error.message}`);
        this.store.state.isStreaming = false;
        this.store.emit(ChatEvent.STREAM_STATE_CHANGED, id, false);
      } finally {
        this.currentAbortController = null;
      }
    } else {
      console.error("No worker or fallback fetcher provided!");
      this.store.state.isStreaming = false;
      this.store.emit(ChatEvent.STREAM_STATE_CHANGED, id, false);
    }
  }

  public stopStream(): void {
    this.store.state.isStreaming = false;
    this.store.emit(ChatEvent.STREAM_STATE_CHANGED, undefined, false);
    
    if (this.worker) {
      this.worker.postMessage({ type: WorkerMessageType.STOP_STREAM });
    } else {
      if (this.currentAbortController) {
        this.currentAbortController.abort();
        this.currentAbortController = null;
      }
      this.fallbackFetcher?.onAbort?.();
    }
  }

  public override onDestroy(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
