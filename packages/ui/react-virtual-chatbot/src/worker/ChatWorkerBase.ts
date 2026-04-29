import { IChatFetcher, WorkerMessage, WorkerMessageType } from './types';

/**
 * A base class/helper to initialize a Web Worker for the Chatbot.
 * Users should call this in their worker file.
 */
export const initChatWorker = (fetcher: IChatFetcher) => {
  let currentAbortController: AbortController | null = null;

  self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type, id, payload } = e.data;

    switch (type) {
      case WorkerMessageType.START_STREAM:
        try {
          if (currentAbortController) {
            currentAbortController.abort();
          }
          currentAbortController = new AbortController();

          const stream = await fetcher.fetchStream(payload);
          
          for await (const chunk of stream) {
            self.postMessage({
              type: WorkerMessageType.STREAM_CHUNK,
              id,
              payload: chunk
            });
          }

          self.postMessage({
            type: WorkerMessageType.STREAM_DONE,
            id
          });
        } catch (error: any) {
          if (error.name === 'AbortError') return;
          self.postMessage({
            type: WorkerMessageType.STREAM_ERROR,
            id,
            payload: error.message
          });
        } finally {
          currentAbortController = null;
        }
        break;

      case WorkerMessageType.STOP_STREAM:
        if (currentAbortController) {
          currentAbortController.abort();
          currentAbortController = null;
        }
        fetcher.onAbort?.();
        break;
    }
  };
};
