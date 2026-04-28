import React, {
  forwardRef,
  memo,
  useCallback,
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
    itemHeight: rowH,
    height: viewH = 600,
    width = "100%",
    bufferRow = 5,
    className,
    renderItem,
    followOutput = true,
    renderTypingIndicator,
  }: ReactVirtualChatbotProps<T>,
  ref: React.Ref<ReactVirtualChatbotHandle<T>>,
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const prevScrollTime = useRef(performance.now());
  const isAtBottomRef = useRef(false); // Tracks whether user is at the bottom
  const initialScrollDoneRef = useRef(false); // Guard: only auto-scroll once on mount
  const bufferHeightRef = useRef(0);
  const targetHeightRef = useRef(0);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const engine = useMemo(
    () =>
      new VirtualChatbot({
        totalCount: items.length,
        estimatedItemHeight: rowH,
        viewportHeight: viewH,
        buffer: bufferRow,
      }),
    [rowH, viewH, bufferRow], // Don't recreate when items.length changes
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

  const poolSize = useMemo(
    () => engine.getPoolSize(POOL_OVERHEAD, MAX_POOL),
    [engine],
  );

  const updateUI = useCallback(
    (newRange?: VirtualChatbotRange) => {
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

          // 1. Direct DOM positioning (Bypass React)
          if (wrapper) {
            wrapper.style.transform = `translateY(${top}px)`;
            wrapper.style.visibility = isVisible ? "visible" : "hidden";
          }

          lastIdsRef.current[s] = item;
          lastIndicesRef.current[s] = i;
          lastVisRef.current[s] = isVisible ? 1 : 0;

          // 2. Imperative Content Update
          const slotHandle = refsRef.current[s];
          if (slotHandle) {
            slotHandle.update(item, i, wrapper, isVisible);

            // Initial measurement
            if (isVisible) {
              syncHeight(i, s);
            }
          }
        }
      }
    },
    [engine, poolSize, rowH],
  );

  // Synchronize height of a slot and perform scroll anchoring / shifting
  const syncHeight = useCallback(
    (index: number, slotIndex: number) => {
      const wrapper = wrapperRefs.current[slotIndex];
      if (!wrapper || index < 0) return;

      const h = wrapper.offsetHeight;
      if (h <= 0) return;

      const oldTop = engine.getOffset(index);
      const changed = engine.setHeight(index, h);

      if (changed) {
        const container = containerRef.current;
        const content = contentRef.current;

        // 1. Update Content Height with Compensation
        if (content) {
          const actualHeight = engine.getTotalHeight();
          const compensatedHeight = Math.max(
            actualHeight,
            targetHeightRef.current,
          );
          content.style.height = `${compensatedHeight}px`;
        }

        // 2. Scroll Anchoring (Bypass jumping when content above expands)
        if (index < rangeRef.current.start && container) {
          const newTop = engine.getOffset(index);
          container.scrollTop += newTop - oldTop;
        }

        // 3. Re-position follow-on visible slots immediately
        for (let s = 0; s < poolSize; s++) {
          const si = lastIndicesRef.current[s];
          if (si > index) {
            const w = wrapperRefs.current[s];
            if (w) w.style.transform = `translateY(${engine.getOffset(si)}px)`;
          }
        }
      }
    },
    [engine, poolSize],
  );

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
            renderItem={renderItem}
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
      const st = el.scrollTop;
      const sh = el.scrollHeight;
      const ch = el.clientHeight;

      const actualContentHeight = engine.getTotalHeight();
      const distanceToBottom = Math.max(0, actualContentHeight - ch - st);

      if (bufferHeightRef.current > 0) {
        const elasticBuffer = Math.max(0, viewH - distanceToBottom);

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
  }, [engine, updateRange, updateUI, viewH]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    engine.updateOptions({ totalCount: itemsRef.current.length });

    if (initialScrollDoneRef.current) {
      if (followOutput && isAtBottomRef.current) {
        el.scrollTop = 10000000;
        updateRange(el.scrollTop);
      } else {
        updateRange(el.scrollTop);
      }
      return;
    }

    const isRestored = el.scrollTop > 0;

    if (followOutput && !isRestored) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          containerRef.current.scrollTop = 10000000;
          updateRange(containerRef.current.scrollTop);
          isAtBottomRef.current = true;
        });
      });

      setTimeout(() => {
        if (!containerRef.current) return;
        containerRef.current.scrollTop = 10000000;
        updateRange(containerRef.current.scrollTop);
        isAtBottomRef.current = true;
        initialScrollDoneRef.current = true;
      }, 200);
    } else {
      updateRange(el.scrollTop);
      initialScrollDoneRef.current = true;
    }
  }, [engine, updateRange, followOutput]);

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
    appendItems: (newItems: T[], forceScroll?: boolean) => {
      if (Array.isArray(itemsRef.current)) {
        (itemsRef.current as T[]).push(...newItems);
      } else {
        itemsRef.current = [...(itemsRef.current as any), ...newItems];
      }

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
        height: viewH,
        width,
        overflowY: "scroll",
        position: "relative",
        scrollbarGutter: "stable",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: "1 1 0%", minHeight: 0 }} />

      <div
        ref={contentRef}
        style={{
          height: engine.getTotalHeight(),
          width: "100%",
          position: "relative",
          flexShrink: 0,
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
    ref?: React.Ref<ReactVirtualChatbotHandle>;
  },
) => React.ReactElement) & { displayName?: string };

ReactVirtualChatbot.displayName = "ReactVirtualChatbot";
