import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SCROLL_STOP_DELAY } from "virtual-engine";
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
import { RAFEngine, TickContext, TickFn } from "./utils/useRequestAnimation";

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

  // 2. State & Engine Refs
  const [history, setHistory] = useState<ChatMessage[]>(store.state.history);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const prevScrollTime = useRef(performance.now());
  const isAtBottomRef = useRef(false);
  const bufferHeightRef = useRef(0);
  const viewHRef = useRef(600);
  const isAnchoringRef = useRef(false);

  const itemsRef = useRef(history);

  // 2. Initialize VirtualModule
  useEffect(() => {
    store.virtualModule.initEngine({
      totalCount: history.length,
      estimatedItemHeight: rowH,
      viewportHeight: viewHRef.current,
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
      const nextHistory = [...store.state.history];
      setHistory(nextHistory);
      itemsRef.current = nextHistory;
      store.virtualModule.updateTotalCount(nextHistory.length);
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

  // Streaming logic
  const updateBufferRef = useRef<Map<number, string>>(new Map());
  const rafTickRef = useRef<TickFn | null>(null);
  const animationActionRef = useRef<(ctx: TickContext) => void>(() => {});

  animationActionRef.current = () => {
    const buffer = updateBufferRef.current;
    if (buffer.size === 0) return;
    buffer.forEach((content, idx) => {
      for (let s = 0; s < POOL_SIZE; s++) {
        if (store.layoutModule.getIndexInSlot(s) === idx) {
          const slot = store.dom.getHandle(s);
          if (slot) {
            slot.updateText(content);
          }
          break;
        }
      }
    });
    buffer.clear();
  };

  useEffect(() => {
    const unsub = store.subscribe(ChatEvent.MESSAGE_UPDATED, (id, payload) => {
      if (typeof id === "number") {
        const item = store.state.history[id];
        if (item) {
          const fullContent =
            item.parts && item.parts[0]
              ? item.parts[0].content
              : item.content || "";

          updateBufferRef.current.set(id, fullContent);

          if (!rafTickRef.current) {
            rafTickRef.current = RAFEngine.getInstance().addTick({
              intervalTime: 0,
              lastFlush: performance.now(),
              actionRef: animationActionRef,
            });
          }
        }
      }
    });
    return unsub;
  }, [store]);



  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onRafUpdate = () => {
      if (store.layoutModule.isAnchoring) return;
      const el = store.dom.getContainer();
      const currentEngine = store.virtualModule.getEngine();
      if (!el || !currentEngine) return;

      const st = el.scrollTop;
      const ch = el.clientHeight;
      const actualHeight = currentEngine.getTotalHeight();

      const distanceToBottom = Math.max(0, actualHeight - ch - st);
      isAtBottomRef.current = Math.abs(actualHeight - st - ch) < 5;
      store.virtualModule.handleScroll(st);
      if (performance.now() - prevScrollTime.current < SCROLL_STOP_DELAY) {
        rafId.current = requestAnimationFrame(onRafUpdate);
      } else {
        rafId.current = null;
        if (currentEngine) currentEngine.resetVelocity();
      }
    };
    const handleScroll = () => {
      prevScrollTime.current = performance.now();
      if (rafId.current === null)
        rafId.current = requestAnimationFrame(onRafUpdate);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [store.virtualModule]);

  useLayoutEffect(() => {
    if (initialScrollIndex !== undefined && engine) {
      const offset = engine.getOffset(initialScrollIndex);
      if (containerRef.current) containerRef.current.scrollTop = offset;
      store.virtualModule.handleScroll(offset);
    }
  }, []);

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

    scrollToBottom: () => {
      const el = containerRef.current;
      if (el && engine) {
        const targetST = Math.max(0, engine.getTotalHeight() - el.clientHeight);
        el.scrollTop = targetST;
        store.virtualModule.handleScroll(targetST);
      }
    },
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
    scrollToIndex: (index: number) => {
      if (!engine) return;
      const offset = engine.getOffset(index);
      const container = store.dom.getContainer();
      if (container) container.scrollTop = offset;
      store.virtualModule.handleScroll(offset);
    },
    updateItemHeight: (index: number, height: number) => {
      if (engine) {
        engine.setHeight(index, height);
        store.layoutModule.updateUI();
      }
    },
    setBottomBuffer: (h) => {
      bufferHeightRef.current = h;
      const content = store.dom.getContent();
      if (content && engine)
        content.style.height = `${engine.getTotalHeight() + h}px`;
    },
    setTyping: (isVisible: boolean) => {
      if (typingRef.current)
        typingRef.current.style.display = isVisible ? "flex" : "none";
    },
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
            contentRef.current = r;
            store.dom.registerContent(r);
          }}
          style={{
            height: (engine?.getTotalHeight() || 0) + bufferHeightRef.current,
            width: "100%",
            position: "relative",
          }}
        >
          {nodePool}
          <div
            ref={typingRef}
            className="typing-indicator-container"
            style={{
              display: "none",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div className="typing-indicator-content">
              {renderTypingIndicator ? (
                renderTypingIndicator()
              ) : (
                <div className="ai-message-prefix">
                  <GeminiSparkle isLoading={true} />
                  <div className="gemini-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ChatProvider>
  );
};

export const ReactVirtualChatbot = forwardRef(ReactVirtualChatbotInner) as any;
ReactVirtualChatbot.displayName = "ReactVirtualChatbot";
