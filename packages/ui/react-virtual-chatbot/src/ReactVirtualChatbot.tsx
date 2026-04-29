import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { VirtualChatbotRange } from "virtual-chatbot";
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

const MAX_POOL = 256;
const POOL_OVERHEAD = 30;

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

  // Subscribe to store changes
  useEffect(() => {
    // Sync initial state (including persisted values)
    if (onStateChangeRef.current) onStateChangeRef.current({ ...store.state });

    const unsub = store.subscribe(ChatEvent.HISTORY_CHANGED, () => {
      const nextHistory = [...store.state.history];
      setHistory(nextHistory);
      itemsRef.current = nextHistory;
      store.virtualModule.updateTotalCount(nextHistory.length);
      updateUI();

      // Auto-scroll to bottom on new messages if following output
      if (followOutput && containerRef.current) {
        const currentEngine = store.virtualModule.getEngine();
        if (currentEngine) {
          const el = containerRef.current;
          const targetST = Math.max(
            0,
            currentEngine.getTotalHeight() - el.clientHeight,
          );
          requestAnimationFrame(() => {
            el.scrollTop = targetST;
            store.virtualModule.handleScroll(targetST);
          });
        }
      }

      if (onStateChangeRef.current)
        onStateChangeRef.current({ ...store.state });
    });

    const unsubRange = store.subscribe(
      ChatEvent.RANGE_CHANGED,
      (_, range: any) => {
        if (range) {
          rangeRef.current = range;
          updateUI(range);
        }
      },
    );

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
      unsubRange();
      unsubStream();
      unsubConfig();
    };
  }, [store, engine, followOutput]);

  const poolSize = useMemo(
    () => engine?.getPoolSize(POOL_OVERHEAD, MAX_POOL) || MAX_POOL,
    [engine],
  );

  const rangeRef = useRef<VirtualChatbotRange>({ start: 0, end: 0 });
  const slotMapRef = useRef<Int32Array>(new Int32Array(MAX_POOL));
  const refsRef = useRef<(IVirtualChatRowHandle<ChatMessage> | null)[]>(
    new Array(MAX_POOL).fill(null),
  );
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>(
    new Array(MAX_POOL).fill(null),
  );
  const lastIdsRef = useRef<(unknown | null)[]>(new Array(MAX_POOL).fill(null));
  const lastIndicesRef = useRef<Int32Array>(new Int32Array(MAX_POOL).fill(-2));
  const lastVisRef = useRef<Uint8Array>(new Uint8Array(MAX_POOL).fill(0));
  const lastOffsetsRef = useRef<Float64Array>(
    new Float64Array(MAX_POOL).fill(-1),
  );

  const anchorRef = useRef({ index: -1, offset: 0 });

  const recordAnchor = useCallback(() => {
    const container = containerRef.current;
    if (!container || !engine) return;
    const st = container.scrollTop;
    const idx = engine.indexAt(st);
    if (idx >= 0) {
      anchorRef.current = {
        index: idx,
        offset: engine.getOffset(idx) - st,
      };
    }
  }, [engine]);

  const applyAnchor = useCallback(() => {
    const container = containerRef.current;
    const { index, offset } = anchorRef.current;
    if (!container || index < 0 || !engine) return;

    const newOffset = engine.getOffset(index);
    const targetScrollTop = newOffset - offset;

    if (Math.abs(container.scrollTop - targetScrollTop) > 0.5) {
      isAnchoringRef.current = true;
      container.scrollTop = targetScrollTop;
      queueMicrotask(() => {
        isAnchoringRef.current = false;
      });
    }
  }, [engine]);

  const syncHeight = useCallback(
    (index: number, slotIndex: number) => {
      const wrapper = wrapperRefs.current[slotIndex];
      const container = containerRef.current;
      const currentEngine = store.virtualModule.getEngine();
      if (!wrapper || index < 0 || !container || !currentEngine) return;

      const h = wrapper.offsetHeight;
      if (h <= 0) return;

      const oldH = currentEngine.getHeight(index);
      const item = itemsRef.current[index];
      const isLoading = item?.metadata?.isLoading === true;

      const finalH = isLoading ? Math.max(oldH, h) : h;

      if (Math.abs(finalH - oldH) < 0.5) return;

      const changed = currentEngine.setHeight(index, finalH);

      if (changed) {
        if (container.style.scrollBehavior !== "auto") {
          container.style.scrollBehavior = "auto";
        }
        const content = contentRef.current;
        if (content) {
          content.style.height = `${engine.getTotalHeight()}px`;
        }
        for (let s = 0; s < poolSize; s++) {
          const si = lastIndicesRef.current[s];
          if (si > index) {
            const w = wrapperRefs.current[s];
            const newOffset = engine.getOffset(si);
            if (w && lastOffsetsRef.current[s] !== newOffset) {
              w.style.transform = `translateY(${newOffset}px)`;
              lastOffsetsRef.current[s] = newOffset;
            }
          }
        }
      }
    },
    [engine, poolSize],
  );

  const updateUI = useCallback(
    (newRange?: VirtualChatbotRange) => {
      if (!engine) return;
      recordAnchor();
      const range = newRange || rangeRef.current;
      const its = itemsRef.current;
      const pool = poolSize;
      const slotMap = engine.getSlotMap(range, pool, slotMapRef.current);

      for (let s = 0; s < pool; s++) {
        const i = slotMap[s];
        const isOutOfRange = i === -1;
        const item = isOutOfRange ? null : its[i];
        const isVisible = !isOutOfRange;
        const isContentChanged =
          lastIdsRef.current[s] !== item || lastIndicesRef.current[s] !== i;
        const isVisChanged = lastVisRef.current[s] !== (isVisible ? 1 : 0);

        if (isContentChanged || isVisChanged) {
          const wrapper = wrapperRefs.current[s];
          const top = isOutOfRange ? -9999 : engine.getOffset(i);
          if (wrapper) {
            wrapper.style.transform = `translateY(${top}px)`;
            wrapper.style.visibility = isVisible ? "visible" : "hidden";
          }
          lastIdsRef.current[s] = item;
          lastIndicesRef.current[s] = i;
          lastVisRef.current[s] = isVisible ? 1 : 0;
          lastOffsetsRef.current[s] = top;

          const slotHandle = refsRef.current[s];
          if (slotHandle && (isContentChanged || isVisChanged)) {
            slotHandle.update(item, i, wrapper, isVisible);
            if (isVisible) syncHeight(i, s);
          }
        }
      }
      applyAnchor();
    },
    [engine, poolSize, syncHeight, recordAnchor, applyAnchor],
  );

  // Streaming logic
  const updateBufferRef = useRef<Map<number, string>>(new Map());
  const rafTickRef = useRef<TickFn | null>(null);
  const animationActionRef = useRef<(ctx: TickContext) => void>(() => {});

  animationActionRef.current = () => {
    const buffer = updateBufferRef.current;
    if (buffer.size === 0) return;
    buffer.forEach((content, idx) => {
      for (let s = 0; s < poolSize; s++) {
        if (lastIndicesRef.current[s] === idx) {
          const slot = refsRef.current[s];
          if (slot) {
            slot.updateText(content);
            syncHeight(idx, s);
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
  }, [store, poolSize, syncHeight]);

  // Viewport & Scroll
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const h = entries[0].contentRect.height;
      if (h > 0 && h !== viewHRef.current) {
        viewHRef.current = h;
        store.virtualModule.updateViewport(h);
        const el = containerRef.current;
        const currentEngine = store.virtualModule.getEngine();
        if (followOutput && isAtBottomRef.current && el && currentEngine) {
          el.scrollTop = Math.max(0, currentEngine.getTotalHeight() - h);
        }
        updateUI();
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [engine, updateUI, followOutput]);

  const updateRange = useCallback(
    (scrollTop: number) => {
      const velocity = engine.updateVelocity(scrollTop, performance.now());
      const next = engine.computeRange(
        scrollTop,
        engine.getDynamicBuffer(velocity),
      );
      if (next.changed) {
        rangeRef.current.start = next.start;
        rangeRef.current.end = next.end;
        updateUI(rangeRef.current);
      }
    },
    [engine, updateUI],
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onRafUpdate = () => {
      if (isAnchoringRef.current) return;
      const el = containerRef.current;
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
        engine.resetVelocity();
      }
    };
    const handleScroll = () => {
      prevScrollTime.current = performance.now();
      if (rafId.current === null)
        rafId.current = requestAnimationFrame(onRafUpdate);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [engine, store.virtualModule]);

  useLayoutEffect(() => {
    if (initialScrollIndex !== undefined && engine) {
      const offset = engine.getOffset(initialScrollIndex);
      if (containerRef.current) containerRef.current.scrollTop = offset;
      store.virtualModule.handleScroll(offset);
    } else if (followOutput) {
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
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
      if (containerRef.current) containerRef.current.scrollTop = offset;
      store.virtualModule.handleScroll(offset);
    },
    updateItemHeight: (index: number, height: number) => {
      engine.setHeight(index, height);
      updateUI();
    },
    setBottomBuffer: (h) => {
      bufferHeightRef.current = h;
      if (contentRef.current)
        contentRef.current.style.height = `${engine.getTotalHeight() + h}px`;
    },
    setTyping: (isVisible: boolean) => {
      if (typingRef.current)
        typingRef.current.style.display = isVisible ? "flex" : "none";
    },
  }));

  const nodePool = useMemo(() => {
    const pool = poolSize;
    const nodes = [];
    for (let s = 0; s < pool; s++) {
      nodes.push(
        <div
          key={s}
          ref={(r) => {
            wrapperRefs.current[s] = r;
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(-9999px)`,
            visibility: "hidden",
          }}
        >
          <EngineSlot
            ref={(r) => {
              refsRef.current[s] = r;
            }}
            initialIndex={-1}
            initialData={null}
            renderItem={(item: ChatMessage | null, index: number) => {
              if (renderItem) return renderItem(item, index);
              return DefaultChatRenderer(item, index, codeHighlighting);
            }}
          />
        </div>,
      );
    }
    return nodes;
  }, [poolSize, renderItem, codeHighlighting]);

  return (
    <ChatProvider store={store}>
      <div
        ref={containerRef}
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
          ref={contentRef}
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
