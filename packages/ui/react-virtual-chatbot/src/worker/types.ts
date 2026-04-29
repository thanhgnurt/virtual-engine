/**
 * The interface that users must implement to provide AI streaming logic.
 * This can run in either a Web Worker or on the Main Thread.
 */
export interface IChatFetcher {
  /**
   * Starts a streaming request to an AI model.
   * Should yield text chunks as they arrive.
   */
  fetchStream(params: any): AsyncIterable<string> | Promise<AsyncIterable<string>>;
  
  /**
   * Optional: Called when the stream is aborted.
   */
  onAbort?(): void;
}

/**
 * Message types for communication between Main Thread and Worker.
 */
export enum WorkerMessageType {
  START_STREAM = 'START_STREAM',
  STOP_STREAM = 'STOP_STREAM',
  STREAM_CHUNK = 'STREAM_CHUNK',
  STREAM_DONE = 'STREAM_DONE',
  STREAM_ERROR = 'STREAM_ERROR',
}

export interface WorkerMessage {
  type: WorkerMessageType;
  id?: string | number;
  payload?: any;
}
