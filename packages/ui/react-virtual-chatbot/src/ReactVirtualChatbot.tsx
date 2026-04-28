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
import {
  IVirtualChatRowHandle,
  ReactVirtualChatbotHandle,
  ReactVirtualChatbotProps,
} from "./types";

export { setTextNode };

// ─────────────────────────────────────────────
// Sub-components (Internal to the Engine)
// ─────────────────────────────────────────────

/**
 * Passive slot that renders once and delegates all data updates to the children via ref.
 * This ensures 0 overhead during recycling as React never re-renders the slot.
 */
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

  const rangeRef = useRef<VirtualChatbotRange>({ start: 0, end: 0 });
  const slotMapRef = useRef<Int32Array>(new Int32Array(MAX_POOL));

  // High-performance slot management
  const refsRef = useRef<(IVirtualChatRowHandle<T> | null)[]>(
    new Array(MAX_POOL).fill(null),
  );
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>(
    new Array(MAX_POOL).fill(null),
  );

  // Tracking arrays to minimize redundant DOM/ref updates
  const lastIdsRef = useRef<(unknown | null)[]>(new Array(MAX_POOL).fill(null));
  const lastIndicesRef = useRef<Int32Array>(new Int32Array(MAX_POOL).fill(-2));
  const lastVisRef = useRef<Uint8Array>(new Uint8Array(MAX_POOL).fill(0));
  const lastOffsetsRef = useRef<Float64Array>(
    new Float64Array(MAX_POOL).fill(-1),
  );

  const poolSize = useMemo(
    () => engine.getPoolSize(POOL_OVERHEAD, MAX_POOL),
    [engine],
  );

  // --- STABLE ANCHORING ENGINE ---
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

  // Synchronize height of a slot and perform scroll anchoring / shifting
  const syncHeight = useCallback(
    (index: number, slotIndex: number) => {
      const wrapper = wrapperRefs.current[slotIndex];
      const container = containerRef.current;
      if (!wrapper || index < 0 || !container) return;

      const h = wrapper.offsetHeight;
      if (h <= 0) return;

      const oldH = engine.getHeight(index);
      if (Math.abs(h - oldH) < 0.5) return; // Ignore micro changes

      const changed = engine.setHeight(index, h);

      if (changed) {
        if (container.style.scrollBehavior !== "auto") {
          container.style.scrollBehavior = "auto";
        }

        const content = contentRef.current;
        if (content) {
          content.style.height = `${engine.getTotalHeight()}px`;
        }

        // Reposition only subsequent visible slots
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
      recordAnchor(); // Capture position before changes

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
            if (isVisible) {
              syncHeight(i, s);
            }
          }
        }
      }

      applyAnchor(); // Restore position after all updates
    },
    [engine, poolSize, rowH, syncHeight, recordAnchor, applyAnchor],
  );

  // Trigger UI update when items change
  useEffect(() => {
    engine.updateOptions({ totalCount: items.length });
    updateUI();
  }, [items.length, updateUI, engine]);

  // Auto-measure viewport height (Imperative)
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const h = entries[0].contentRect.height;
      if (h > 0 && h !== viewHRef.current) {
        viewHRef.current = h;
        engine.updateOptions({ viewportHeight: h });
        updateUI();
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [engine, updateUI]);

  const nodePool = useMemo(() => {
    const pool = poolSize;
    const items = [];

    lastIdsRef.current.fill(null);
    lastIndicesRef.current.fill(-2);
    lastVisRef.current.fill(0);

    for (let s = 0; s < pool; s++) {
      items.push(
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
    return items;
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
            if (index !== -1) {
              syncHeight(index, s);
            }
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

      const actualContentHeight = engine.getTotalHeight();
      const distanceToBottom = Math.max(0, actualContentHeight - ch - st);

      if (bufferHeightRef.current > 0) {
        const elasticBuffer = Math.max(0, viewHRef.current - distanceToBottom);

        if (elasticBuffer !== bufferHeightRef.current) {
          bufferHeightRef.current = elasticBuffer;
          targetHeightRef.current = actualContentHeight + elasticBuffer;
          if (contentRef.current) {
            contentRef.current.style.height = `${targetHeightRef.current}px`;
          }
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

    const sh = el.scrollHeight;
    const st = el.scrollTop;
    const ch = el.clientHeight;
    isAtBottomRef.current = sh - st - ch < 20 || sh <= ch;

    const handleScroll = () => {
      prevScrollTime.current = performance.now();
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(onRafUpdate);
      }
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

    engine.updateOptions({ totalCount: itemsRef.current.length });

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
      // Content-Aware Scroll: Wait for engine to stabilize total height
      const performInitialScroll = () => {
        if (!containerRef.current) return;
        const totalH = engine.getTotalHeight();
        if (totalH <= 0) return;

        const ch = containerRef.current.clientHeight;
        
        let targetST = 0;
        if (initialScrollIndex !== undefined && initialScrollIndex >= 0 && initialScrollIndex < itemsRef.current.length) {
          targetST = engine.getOffset(initialScrollIndex);
        } else if (followOutput) {
          targetST = Math.max(0, totalH - ch);
          isAtBottomRef.current = true;
        }

        containerRef.current.scrollTop = targetST;
        updateRange(targetST);
        initialScrollDoneRef.current = true;
      };

      // Use a double-frame wait to ensure initial render and measurement complete
      requestAnimationFrame(() => {
        requestAnimationFrame(performInitialScroll);
      });

      // Safe fallback for complex layouts
      setTimeout(performInitialScroll, 300);
    } else {
      updateRange(el.scrollTop);
      initialScrollDoneRef.current = true;
    }
  }, [engine, updateRange, followOutput, initialScrollIndex]);

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
      const its = itemsRef.current as any[];
      if (its && its[index]) {
        const item = its[index];
        const updatedMetadata = { ...(item.metadata || {}), ...patch };
        const updatedItem = { ...item, metadata: updatedMetadata };
        // Reuse existing updateItem logic
        (ref as any).current.updateItem(index, updatedItem);
      }
    },
    appendItems: (newItems: T[], forceScroll?: boolean) => {
      // Create a NEW array to avoid mutating the original prop (Immutability)
      const prevItems = Array.isArray(itemsRef.current)
        ? itemsRef.current
        : Array.from(itemsRef.current);
      const nextItems = [...prevItems, ...newItems] as T[];
      itemsRef.current = nextItems;

      const newLength = itemsRef.current.length;
      engine.updateOptions({ totalCount: newLength });

      const el = containerRef.current;
      const content = contentRef.current;

      if (el && content) {
        const totalSize = engine.getTotalHeight() + bufferHeightRef.current;
        content.style.height = `${totalSize}px`;

        let targetST = el.scrollTop;
        if (forceScroll || (isAtBottomRef.current && followOutput)) {
          targetST = Math.max(0, engine.getTotalHeight() - el.clientHeight);
          el.scrollTop = targetST;
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

          if (autoScroll && container) {
            container.scrollTop = container.scrollHeight;
          }
        } else {
          bufferHeightRef.current = 0;
          targetHeightRef.current = 0;
          if (content) content.style.height = `${engine.getTotalHeight()}px`;
        }
      }
    },
    updateMessageText: (index: number, text: string) => {
      // 1. Update source data first to ensure recycling preserves the content
      const its = itemsRef.current as any[];
      if (its && its[index]) {
        const item = its[index];
        if (typeof item.content === "string") {
          item.content = text;
        } else if (
          item.parts &&
          item.parts[0] &&
          item.parts[0].type === "text"
        ) {
          item.parts[0].content = text;
        } else if (!item.parts) {
          // Fallback if content was empty
          item.content = text;
        }
      }

      // 2. Update the visible slot immediately
      for (let s = 0; s < poolSize; s++) {
        if (lastIndicesRef.current[s] === index) {
          const slot = refsRef.current[s];
          if (slot) {
            slot.updateText(text);
            syncHeight(index, s);
          }
          break;
        }
      }
    },
    updateItem: (index: number, newItem: T) => {
      if (Array.isArray(itemsRef.current)) {
        (itemsRef.current as T[])[index] = newItem;
      } else {
        (itemsRef.current as any)[index] = newItem;
      }

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
      return Array.isArray(itemsRef.current) ? itemsRef.current.length : 0;
    },
    scrollToIndex: (index: number) => {
      const el = containerRef.current;
      if (el) {
        const targetST = engine.getOffset(index);
        el.scrollTop = targetST;
        updateRange(targetST);
      }
    },
    setBottomBuffer: (height: number) => {
      const actualHeight = engine.getTotalHeight();
      bufferHeightRef.current = height;
      targetHeightRef.current = actualHeight + height;
      if (contentRef.current) {
        contentRef.current.style.height = `${targetHeightRef.current}px`;
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
              <div className="gemini-progress-icon">
                <div className="spinner"></div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ position: "relative", zIndex: 2 }}
                >
                  <path
                    d="M12 0L14.59 7.41L22 10L14.59 12.59L12 20L9.41 12.59L2 10L9.41 7.41L12 0Z"
                    fill="url(#typing-grad)"
                  />
                  <defs>
                    <linearGradient
                      id="typing-grad"
                      x1="2"
                      y1="0"
                      x2="22"
                      y2="20"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#4B90FF" />
                      <stop offset="0.5" stopColor="#FF5546" />
                      <stop offset="1" stopColor="#9176FF" />
                    </linearGradient>
                  </defs>
                </svg>
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
