import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DefaultChatRenderer } from "./components/DefaultChatRenderer";
import { EngineSlot } from "./components/EngineSlot";
import { TypingIndicator } from "./components/TypingIndicator";
import { ChatStore } from "./store";
import { ChatProvider } from "./store/ChatContext";
import { ChatEvent, ChatState } from "./store/types";
import {
  ChatMessage,
  ReactVirtualChatbotHandle,
  ReactVirtualChatbotProps,
} from "./types";

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

const POOL_SIZE = 32;

/**
 * Extended Props for the "Black Box" Chatbot
 */
export interface EnhancedChatbotProps extends Partial<
  ReactVirtualChatbotProps<ChatMessage>
> {
  worker?: Worker;
  fallbackFetcher?: any;
  selectedModelId?: string;
  onStateChange?: (state: ChatState) => void;
  history?: ChatMessage[];
}

const ReactVirtualChatbotInner = (
  props: EnhancedChatbotProps,
  ref: React.Ref<ReactVirtualChatbotHandle<ChatMessage>>,
) => {
  const {
    itemHeight: rowH = 100,
    width = "100%",
    bufferRow = 5,
    className,
    renderItem,
    followOutput = true,
    initialScrollIndex,
    renderTypingIndicator,
    codeHighlighting = true,
    worker,
    fallbackFetcher,
    selectedModelId,
    onStateChange,
    history: initialHistory,
  } = props;

  // 1. Store Initialization (The Heart of the Black Box)
  const [store] = useState(
    () =>
      new ChatStore({
        worker,
        fallbackFetcher,
        initialState: {
          selectedModelId,
          history: initialHistory || [],
        },
      }),
  );

  useEffect(() => {
    if (selectedModelId) store.setSelectedModel(selectedModelId);
  }, [selectedModelId, store]);

  // 2. DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // 2. Initialize VirtualModule
  useEffect(() => {
    store.virtualModule.initEngine({
      totalCount: store.state.history.length,
      estimatedItemHeight: rowH,
      viewportHeight: 600, // Initial guess, ResizeModule will correct it
      buffer: bufferRow,
    });
  }, [store, rowH, bufferRow]);

  const engine = store.virtualModule.getEngine();
  const engineRef = useRef(engine);
  engineRef.current = engine;

  // Stable Ref for callback to avoid infinite loops
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  // Force initial UI update once engine is ready
  useLayoutEffect(() => {
    if (engine) {
      store.layoutModule.updateUI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, store.virtualModule]);

  // Subscribe to store changes
  useEffect(() => {
    // Sync initial state (including persisted values)
    if (onStateChangeRef.current) onStateChangeRef.current({ ...store.state });

    const unsub = store.subscribe(ChatEvent.HISTORY_CHANGED, () => {
      const nextHistoryLength = store.state.history.length;
      store.virtualModule.updateTotalCount(nextHistoryLength);
      store.layoutModule.updateUI();

      if (onStateChangeRef.current)
        onStateChangeRef.current({ ...store.state });
    });

    const unsubStream = store.subscribe(ChatEvent.STREAM_STATE_CHANGED, () => {
      if (onStateChangeRef.current)
        onStateChangeRef.current({ ...store.state });
    });

    const unsubConfig = store.subscribe(ChatEvent.CONFIG_CHANGED, () => {
      if (onStateChangeRef.current)
        onStateChangeRef.current({ ...store.state });
    });

    return () => {
      unsub();
      unsubStream();
      unsubConfig();
    };
  }, [store, engine, followOutput]);

  // ─────────────────────────────────────────────
  // Imperative Handle
  // ─────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    get element() {
      return containerRef.current;
    },
    get store() {
      return store;
    },
    get state() {
      return store.state;
    },

    sendMessage: (text: string) => store.sendMessage(text),
    stopStreaming: () => store.workerModule.stopStream(),
    setSelectedModel: (id: string) => store.setSelectedModel(id),

    scrollToBottom: () => store.scrollModule.scrollToBottom(),
    focusLastItem: () =>
      store.layoutModule.calculateAndApplyMinHeight(
        store.historyModule.getCount() - 1,
      ),

    // Legacy methods for backward compatibility
    appendItems: (newItems) => store.historyModule.appendMessages(newItems),
    patchMetadata: (index, patch) =>
      store.historyModule.updateMessageMetadata(index, patch),
    updateMessageText: (index, text) =>
      store.emit(ChatEvent.MESSAGE_UPDATED, index, text),
    updateItem: (index, newItem) => {
      const next = [...store.state.history];
      next[index] = newItem;
      store.historyModule.setHistory(next);
    },
    getTotalCount: () => store.historyModule.getCount(),
    scrollToIndex: (index: number) => store.scrollModule.scrollToIndex(index),
    updateItemHeight: (index: number, height: number) => {
      if (engine) {
        engine.setHeight(index, height);
        store.layoutModule.updateUI();
      }
    },
    setBottomBuffer: (h) => store.scrollModule.setBottomBuffer(h),
    setTyping: (isVisible: boolean) =>
      store.uiStatusModule.setTyping(isVisible),
  }));

  const nodePool = useMemo(() => {
    const nodes = [];
    for (let s = 0; s < POOL_SIZE; s++) {
      nodes.push(
        <div
          key={s}
          ref={(r) => {
            store.dom.registerWrapper(s, r);
            store.resizeModule.register(s, r);
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(-9999px)`,
            visibility: "hidden",
            contain: "content",
          }}
        >
          <EngineSlot
            ref={(r) => {
              store.dom.registerHandle(s, r);
            }}
            initialIndex={-1}
            initialData={null}
            renderItem={(item: ChatMessage | null, index: number) => {
              if (renderItem) return renderItem(item as any, index);
              return DefaultChatRenderer(item, index, codeHighlighting);
            }}
          />
        </div>,
      );
    }
    return nodes;
  }, [renderItem, codeHighlighting]);

  return (
    <ChatProvider store={store}>
      <div
        ref={(r) => {
          containerRef.current = r;
          store.dom.registerContainer(r);
          store.resizeModule.initContainer(r);
          store.scrollModule.init(r, initialScrollIndex);
        }}
        className={className}
        style={{
          height: "100%",
          width,
          overflowY: "scroll",
          position: "relative",
          scrollbarGutter: "stable",
        }}
      >
        <div
          ref={(r) => {
            store.dom.registerContent(r);
          }}
          style={{
            height: 0, // Will be managed imperatively by ScrollModule
            width: "100%",
            position: "relative",
          }}
        >
          {nodePool}
          <TypingIndicator renderCustom={renderTypingIndicator} />
        </div>
      </div>
    </ChatProvider>
  );
};

export const ReactVirtualChatbot = forwardRef(ReactVirtualChatbotInner) as (<
  T = ChatMessage,
>(
  props: EnhancedChatbotProps & {
    ref?: React.Ref<ReactVirtualChatbotHandle<T>>;
  },
) => React.ReactElement) & { displayName: string };

ReactVirtualChatbot.displayName = "ReactVirtualChatbot";
