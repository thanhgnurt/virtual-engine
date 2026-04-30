import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { TypingIndicator } from "./components/TypingIndicator";
import { GeminiSparkle } from "./components/GeminiSparkle";
import { UniversalChatRow } from "./components/UniversalChatRow";
import { ChatStore } from "./store";
import { ChatProvider } from "./store/ChatContext";
import { ChatEvent } from "./store/types";
import {
  ChatMessage,
  IVirtualChatRowHandle,
  ReactVirtualChatbotHandle,
  ReactVirtualChatbotProps,
} from "./types";


// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const EngineSlot = memo(
  forwardRef(
    <T,>(
      {
        initialIndex,
        initialData,
        renderItem,
      }: {
        initialIndex: number;
        initialData: T | null;
        renderItem: (item: T | null, index: number) => React.ReactElement;
      },
      ref: React.Ref<IVirtualChatRowHandle<T>>,
    ) => {
      const node = renderItem(initialData, initialIndex);
      if (React.isValidElement(node)) {
        return React.cloneElement(node as React.ReactElement, { ref });
      }
      return <>{node}</>;
    },
  ),
  () => true,
);

const DefaultChatRenderer = (
  item: ChatMessage | null,
  index: number,
  codeHighlighting?: boolean,
) => {
  if (item?.role === "assistant") {
    return (
      <div key={item.id} className="assistant-message-wrapper">
        <div className="ai-message-prefix">
          <GeminiSparkle isLoading={item.metadata?.isLoading} />
        </div>
        <UniversalChatRow
          item={{ ...item, index } as any}
          codeHighlighting={codeHighlighting}
        />
      </div>
    );
  }
  return (
    <UniversalChatRow
      key={item?.id || index}
      item={{ ...item, index } as any}
      codeHighlighting={codeHighlighting}
    />
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

const POOL_SIZE = 40;

/**
 * Extended Props for the "Black Box" Chatbot
 */
export interface EnhancedChatbotProps extends Partial<
  ReactVirtualChatbotProps<ChatMessage>
> {
  worker?: Worker;
  fallbackFetcher?: any;
  apiKey?: string;
  selectedModelId?: string;
  onStateChange?: (state: any) => void;
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
    apiKey,
    selectedModelId,
    onStateChange,
    history: initialHistory,
  } = props;

  // 1. Store Initialization (The Heart of the Black Box)
  const store = useMemo(
    () =>
      new ChatStore({
        worker,
        fallbackFetcher,
        initialState: {
          apiKey,
          selectedModelId,
          history: initialHistory || [],
        },
      }),
    [],
  );

  // Sync props to store
  useEffect(() => {
    if (apiKey) store.setApiKey(apiKey);
  }, [apiKey, store]);
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
    setApiKey: (key: string) => store.setApiKey(key),
    setSelectedModel: (id: string) => store.setSelectedModel(id),

    scrollToBottom: () => store.scrollModule.scrollToBottom(),
    focusLastItem: () =>
      store.layoutModule.calculateAndApplyMinHeight(
        store.historyModule.getCount() - 1,
      ),

    // Legacy methods for backward compatibility
    appendItems: (newItems) =>
      store.historyModule.appendMessages(newItems as any),
    patchMetadata: (index, patch) =>
      store.historyModule.updateMessageMetadata(index, patch),
    updateMessageText: (index, text) =>
      store.emit(ChatEvent.MESSAGE_UPDATED, index, text),
    updateItem: (index, newItem) => {
      const next = [...store.state.history];
      next[index] = newItem as any;
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
    setTyping: (isVisible: boolean) => store.uiStatusModule.setTyping(isVisible),
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
            renderItem={(item: any, index: number) => {
              if (renderItem) return renderItem(item, index);
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

export const ReactVirtualChatbot = forwardRef(ReactVirtualChatbotInner) as any;
ReactVirtualChatbot.displayName = "ReactVirtualChatbot";
