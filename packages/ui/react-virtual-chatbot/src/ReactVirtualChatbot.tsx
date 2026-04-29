import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { VirtualChatbot, VirtualChatbotRange } from "virtual-chatbot";
import { SCROLL_STOP_DELAY, setTextNode } from "virtual-engine";
import { GeminiSparkle } from "./components/GeminiSparkle";
import {
  ChatMessage,
  IVirtualChatRowHandle,
  ReactVirtualChatbotHandle,
  ReactVirtualChatbotProps,
} from "./types";
import { RAFEngine, TickContext, TickFn } from "./utils/useRequestAnimation";

export { setTextNode };

// ─────────────────────────────────────────────
// Sub-components (Internal to the Engine)
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
  () => true, // Truly static container
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

const MAX_POOL = 256;
const POOL_OVERHEAD = 30;

const ReactVirtualChatbotInner = <T,>(
  {
    items,
    itemHeight: rowH = 100,
    width = "100%",
    bufferRow = 5,
    className,
    renderItem,
    followOutput = true,
    initialScrollIndex,
    renderTypingIndicator,
  }: ReactVirtualChatbotProps<T>,
  ref: React.Ref<ReactVirtualChatbotHandle<T>>,
) => {
  // 1. Basic Refs & Engine Initialization
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const prevScrollTime = useRef(performance.now());
  const isAtBottomRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const bufferHeightRef = useRef(0);
  const targetHeightRef = useRef(0);
  const viewHRef = useRef(600);
  const isAnchoringRef = useRef(false);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const engine = useMemo(
    () =>
      new VirtualChatbot({
        totalCount: items.length,
        estimatedItemHeight: rowH,
        viewportHeight: viewHRef.current,
        buffer: bufferRow,
      }),
    [rowH, bufferRow, items.length],
  );
  const engineRef = useRef(engine);
  engineRef.current = engine;

  const poolSize = useMemo(
    () => engine.getPoolSize(POOL_OVERHEAD, MAX_POOL),
    [engine],
  );

  // 2. Virtualization Data Refs
  const rangeRef = useRef<VirtualChatbotRange>({ start: 0, end: 0 });
  const slotMapRef = useRef<Int32Array>(new Int32Array(MAX_POOL));
  const refsRef = useRef<(IVirtualChatRowHandle<T> | null)[]>(
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

  // 3. Core Utility Functions (Positioning & Sync)
  const anchorRef = useRef({ index: -1, offset: 0 });

  const recordAnchor = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
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
    if (!container || index < 0) return;

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
      if (!wrapper || index < 0 || !container) return;

      const h = wrapper.offsetHeight;
      if (h <= 0) return;

      const oldH = engine.getHeight(index);
      const isLast = index === (itemsRef.current as any).length - 1;
      
      // For the last item (likely streaming), we only allow it to grow to avoid jitter.
      // It can only shrink if it's not the last item anymore or if it's a significant manual change.
      const finalH = isLast ? Math.max(oldH, h) : h;
      
      if (Math.abs(finalH - oldH) < 0.5) return;

      const changed = engine.setHeight(index, finalH);

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

  // 4. High-Performance Streaming Engine
  const updateBufferRef = useRef<Map<number, string>>(new Map());
  const rafTickRef = useRef<TickFn | null>(null);
  const animationActionRef = useRef<(ctx: TickContext) => void>(() => {});

  const processStreamingUpdates = useCallback(() => {
    const buffer = updateBufferRef.current;
    if (buffer.size === 0) return;

    buffer.forEach((content, idx) => {
      for (let s = 0; s < poolSize; s++) {
        if (lastIndicesRef.current[s] === idx) {
          const slot = refsRef.current[s];
          if (slot) {
            slot.updateText(content);
            syncHeight(idx, s);
            const el = containerRef.current;
            if (followOutput && isAtBottomRef.current && el) {
              const targetST = Math.max(
                0,
                engineRef.current.getTotalHeight() - el.clientHeight,
              );
              el.scrollTop = targetST;
            }
          }
          break;
        }
      }
    });
    buffer.clear();
  }, [poolSize, syncHeight, followOutput]);

  animationActionRef.current = processStreamingUpdates;

  const updateMessageTextThrottled = useCallback(
    (index: number, text: string) => {
      // Cast to any first to handle generic T, then use internal structure
      const its = itemsRef.current as any;
      if (its && its[index]) {
        const item = its[index] as ChatMessage;
        if (typeof item.content === "string") item.content = text;
        else if (item.parts?.[0]?.type === "text") item.parts[0].content = text;
        else if (!item.parts) item.content = text;
      }
      updateBufferRef.current.set(index, text);
      if (!rafTickRef.current) {
        const raf = RAFEngine.getInstance();
        rafTickRef.current = raf.addTick({
          intervalTime: 0,
          lastFlush: performance.now(),
          actionRef: animationActionRef,
        });
      }
    },
    [],
  );

  // 5. Lifecycle Effects
  useEffect(() => {
    engine.updateOptions({ totalCount: items.length });
    updateUI();
  }, [items.length, updateUI, engine]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const h = entries[0].contentRect.height;
      if (h > 0 && h !== viewHRef.current) {
        viewHRef.current = h;
        engine.updateOptions({ viewportHeight: h });
        const el = containerRef.current;
        if (followOutput && isAtBottomRef.current && el) {
          const targetST = Math.max(0, engine.getTotalHeight() - h);
          el.scrollTop = targetST;
        }
        updateUI();
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [engine, updateUI, followOutput]);

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
            renderItem={renderItem as any}
          />
        </div>,
      );
    }
    return nodes;
  }, [poolSize, renderItem]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    const st = el ? el.scrollTop : 0;
    lastVisRef.current.fill(0);
    updateUI(engine.computeRange(st));
  }, [engine, nodePool, updateUI]);

  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        for (let s = 0; s < poolSize; s++) {
          if (wrapperRefs.current[s] === target) {
            const index = lastIndicesRef.current[s];
            if (index !== -1) syncHeight(index, s);
            break;
          }
        }
      }
    });
    wrapperRefs.current.forEach((w) => {
      if (w) observer.observe(w);
    });
    return () => observer.disconnect();
  }, [poolSize, nodePool, syncHeight]);

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
      const st = el.scrollTop;
      const sh = el.scrollHeight;
      const ch = el.clientHeight;
      const actualHeight = engine.getTotalHeight();
      const distanceToBottom = Math.max(0, actualHeight - ch - st);

      if (bufferHeightRef.current > 0) {
        const elasticBuffer = Math.max(0, viewHRef.current - distanceToBottom);
        if (elasticBuffer !== bufferHeightRef.current) {
          bufferHeightRef.current = elasticBuffer;
          targetHeightRef.current = actualHeight + elasticBuffer;
          if (contentRef.current)
            contentRef.current.style.height = `${targetHeightRef.current}px`;
        }
      }
      isAtBottomRef.current = Math.abs(sh - st - ch) < 20;
      updateRange(st);
      if (performance.now() - prevScrollTime.current < SCROLL_STOP_DELAY) {
        rafId.current = requestAnimationFrame(onRafUpdate);
      } else {
        rafId.current = null;
        engine.resetVelocity();
        const finalRange = engine.computeRange(st);
        if (finalRange.changed) {
          rangeRef.current.start = finalRange.start;
          rangeRef.current.end = finalRange.end;
          updateUI(rangeRef.current);
        }
      }
    };
    const handleScroll = () => {
      prevScrollTime.current = performance.now();
      if (rafId.current === null)
        rafId.current = requestAnimationFrame(onRafUpdate);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [engine, updateRange, updateUI]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (initialScrollDoneRef.current) {
      if (followOutput && isAtBottomRef.current) {
        const targetST = Math.max(0, engine.getTotalHeight() - el.clientHeight);
        el.scrollTop = targetST;
        updateRange(targetST);
      } else {
        updateRange(el.scrollTop);
      }
      return;
    }
    const isRestored = el.scrollTop > 0;
    if ((initialScrollIndex !== undefined || followOutput) && !isRestored) {
      const performInitialScroll = () => {
        if (!containerRef.current) return;
        const totalH = engine.getTotalHeight();
        if (totalH <= 0) return;
        const ch = containerRef.current.clientHeight;
        let targetST = 0;
        if (
          initialScrollIndex !== undefined &&
          initialScrollIndex >= 0 &&
          initialScrollIndex < (itemsRef.current as any).length
        ) {
          targetST = engine.getOffset(initialScrollIndex);
        } else if (followOutput) {
          targetST = Math.max(0, totalH - ch);
          isAtBottomRef.current = true;
        }
        containerRef.current.scrollTop = targetST;
        updateRange(targetST);
        initialScrollDoneRef.current = true;
      };
      requestAnimationFrame(() => {
        requestAnimationFrame(performInitialScroll);
      });
      setTimeout(performInitialScroll, 300);
    } else {
      updateRange(el.scrollTop);
      initialScrollDoneRef.current = true;
    }
  }, [engine, updateRange, followOutput, initialScrollIndex]);

  // 6. Imperative Handle
  useImperativeHandle(ref, () => ({
    get element() {
      return containerRef.current;
    },
    scrollToBottom: () => {
      const el = containerRef.current;
      if (el) {
        const targetST = Math.max(0, engine.getTotalHeight() - el.clientHeight);
        el.scrollTop = targetST;
        updateRange(targetST);
      }
    },
    patchMetadata: (index: number, patch: any) => {
      const its = itemsRef.current as any;
      if (its && its[index]) {
        const item = its[index];
        const updatedMetadata = { ...(item.metadata || {}), ...patch };
        const updatedItem = { ...item, metadata: updatedMetadata };
        (ref as any).current.updateItem(index, updatedItem);
      }
    },
    appendItems: (newItems: T[], forceScroll?: boolean) => {
      const prevItems = Array.isArray(itemsRef.current)
        ? itemsRef.current
        : Array.from(itemsRef.current);
      const nextItems = [...prevItems, ...newItems] as T[];
      itemsRef.current = nextItems;
      engine.updateOptions({ totalCount: nextItems.length });
      const el = containerRef.current;
      const content = contentRef.current;
      if (el && content) {
        const totalSize = engine.getTotalHeight() + bufferHeightRef.current;
        content.style.height = `${totalSize}px`;
        let targetST = el.scrollTop;
        if (forceScroll || (isAtBottomRef.current && followOutput)) {
          targetST = Math.max(0, engine.getTotalHeight() - el.clientHeight);
          el.scrollTop = targetST;
          if (forceScroll) isAtBottomRef.current = true;
        }
        const velocity = engine.getVelocity();
        const next = engine.computeRange(
          targetST,
          engine.getDynamicBuffer(velocity),
        );
        rangeRef.current.start = next.start;
        rangeRef.current.end = next.end;
        updateUI(rangeRef.current);
      }
    },
    setTyping: (isVisible: boolean, autoScroll = true) => {
      const el = typingRef.current;
      const container = containerRef.current;
      const content = contentRef.current;
      if (el) {
        el.style.display = isVisible ? "flex" : "none";
        if (isVisible) {
          bufferHeightRef.current = 800;
          targetHeightRef.current = engine.getTotalHeight() + 800;
          if (content) content.style.height = `${targetHeightRef.current}px`;
          const top = engine.getTotalHeight();
          el.style.transform = `translateY(${top}px)`;
          if (autoScroll && container)
            container.scrollTop = container.scrollHeight;
        } else {
          bufferHeightRef.current = 0;
          targetHeightRef.current = 0;
          if (content) content.style.height = `${engine.getTotalHeight()}px`;
        }
      }
    },
    updateMessageText: (index: number, text: string) => {
      updateMessageTextThrottled(index, text);
    },
    updateItem: (index: number, newItem: T) => {
      const its = itemsRef.current as any;
      if (Array.isArray(its)) its[index] = newItem;
      else its[index] = newItem;

      for (let s = 0; s < poolSize; s++) {
        if (lastIndicesRef.current[s] === index) {
          const slot = refsRef.current[s];
          if (slot) {
            const wrapper = wrapperRefs.current[s];
            slot.update(newItem, index, wrapper, true);
            syncHeight(index, s);
          }
          break;
        }
      }
    },
    getTotalCount: () => {
      return (itemsRef.current as any).length || 0;
    },
    scrollToIndex: (index: number) => {
      const el = containerRef.current;
      if (el && index >= 0 && index < (itemsRef.current as any).length) {
        const offset = engine.getOffset(index);
        el.scrollTop = offset;
        updateRange(offset);
      }
    },
    updateItemHeight: (index: number, height: number) => {
      const changed = engine.setHeight(index, height);
      if (changed && contentRef.current) {
        contentRef.current.style.height = `${engine.getTotalHeight()}px`;
        updateUI();
      }
    },
    setBottomBuffer: (height: number) => {
      const actualHeight = engine.getTotalHeight();
      bufferHeightRef.current = height;
      targetHeightRef.current = actualHeight + height;
      if (contentRef.current)
        contentRef.current.style.height = `${targetHeightRef.current}px`;
    },
    focusLastItem: () => {
      const container = containerRef.current;
      const its = itemsRef.current as any;
      const count = its.length;
      if (!container || count < 2) return;

      const viewportHeight = container.clientHeight;
      const aiIdx = count - 1;
      const userIdx = count - 2;

      // 1. Clear minHeight from ALL items first to ensure only the last one is focused
      for (let i = 0; i < count; i++) {
        if (its[i].metadata?.minHeight) {
          its[i].metadata = { ...its[i].metadata, minHeight: undefined };
          // If in pool, update it
          for (let s = 0; s < poolSize; s++) {
            if (lastIndicesRef.current[s] === i) {
              const slot = refsRef.current[s];
              if (slot) slot.update(its[i], i, wrapperRefs.current[s], true);
              break;
            }
          }
        }
      }
      
      // 2. Calculate and set new minHeight for the last item
      const userHeight = engine.getHeight(userIdx);
      const targetMinHeight = Math.max(0, viewportHeight - userHeight);
      
      if (its[aiIdx]) {
        its[aiIdx].metadata = { ...its[aiIdx].metadata, minHeight: `${targetMinHeight}px` };
        engine.setHeight(aiIdx, Math.max(engine.getHeight(aiIdx), targetMinHeight));
        
        if (contentRef.current) {
          contentRef.current.style.height = `${engine.getTotalHeight()}px`;
        }
        
        for (let s = 0; s < poolSize; s++) {
          if (lastIndicesRef.current[s] === aiIdx) {
            const slot = refsRef.current[s];
            if (slot) slot.update(its[aiIdx], aiIdx, wrapperRefs.current[s], true);
            break;
          }
        }
        
        updateUI();
        const offset = engine.getOffset(userIdx);
        container.scrollTop = offset;
      }
    },
  }));

  return (
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
          height: engine.getTotalHeight() + bufferHeightRef.current,
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
  );
};

export const ReactVirtualChatbot = forwardRef(ReactVirtualChatbotInner) as (<T>(
  props: ReactVirtualChatbotProps<T> & {
    ref?: React.Ref<ReactVirtualChatbotHandle<T>>;
  },
) => React.ReactElement) & { displayName?: string };

ReactVirtualChatbot.displayName = "ReactVirtualChatbot";
