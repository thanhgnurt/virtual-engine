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
import {
  SCROLL_STOP_DELAY,
  setTextNode,
} from "virtual-engine";
import {
  VirtualChatbot,
  VirtualChatbotRange,
} from "virtual-chatbot";

export { setTextNode };

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/**
 * A ultra-high performance text component that updates via direct DOM
 * manipulation using setTextNode helper.
 * Use this inside renderItem for maximum streaming performance.
 */
export const VirtualChatText = memo(
  ({ text, className }: { text: string; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);

    // Initial render set
    useLayoutEffect(() => {
      if (ref.current) setTextNode(ref.current, text);
    }, [text]);

    return <div ref={ref} className={className} />;
  },
);

/**
 * Handle used by the engine to imperatively update a visible message slot.
 */
export interface IVirtualChatRowHandle<T = unknown> {
  update: (
    item: T | null,
    index: number,
    rowElement: HTMLDivElement | null,
    isVisible: boolean,
  ) => void;
  updateText: (text: string) => void;
}

export interface ReactVirtualChatbotProps<T> {
  /** The list of messages to display */
  items: ArrayLike<T>;
  /** Fixed height of each message (REQUIRED for this baseline) */
  itemHeight: number;
  /** Height of the scroll container */
  height?: number;
  /** Width of the scroll container */
  width?: string | number;
  /** Number of buffer rows to render outside visible area */
  bufferRow?: number;
  /** Optional class for the container */
  className?: string;
  /** Function to render each message */
  renderItem: (
    item: T | null,
    index: number,
  ) => React.ReactElement<{ ref?: React.Ref<IVirtualChatRowHandle<T>> }>;
  /** Whether to automatically scroll to bottom on new items */
  followOutput?: boolean;
  /** Optional custom component to render as the 'Thinking' indicator */
  renderTypingIndicator?: () => React.ReactNode;
}

export interface ReactVirtualChatbotHandle<T = any> {
  readonly element: HTMLDivElement | null;
  scrollToBottom: () => void;
  /**
   * Imperatively append messages without triggering a React re-render.
   * @param forceScroll If true, will unconditionally scroll to the bottom.
   */
  appendItems: (newItems: any[], forceScroll?: boolean) => void;
  /**
   * Show/hide a typing indicator ("AI is typing...")
   * @param autoScroll If true, will jump to bottom. Default: true.
   */
  setTyping: (isVisible: boolean, autoScroll?: boolean) => void;
  /**
   * Specialized method to imperatively update a specific message's text node.
   * Extremely fast, bypasses React.
   */
  updateMessageText: (index: number, text: string) => void;
  /**
   * Update the underlying data for an item and refresh its slot if visible.
   */
  updateItem: (index: number, newItem: T) => void;
  /**
   * Scroll smoothly to a specific message index.
   */
  scrollToIndex: (index: number) => void;
  /**
   * Set a temporary bottom buffer to allow the last message to scroll to top.
   */
  setBottomBuffer: (height: number) => void;
  /**
   * Get the true total number of chat items managed internally.
   */
  getTotalCount: () => number;
}

// ─────────────────────────────────────────────
// Sub-components
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
  const isAtBottomRef = useRef(true);
  const bufferHeightRef = useRef(0);

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
    [rowH, viewH, bufferRow, items.length],
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
            console.log(`[updateUI] Re-binding slot ${s} to index ${i} at top ${top}px`);
            slotHandle.update(item, i, wrapper, isVisible);
          }
        }
      }
    },
    [engine, poolSize, rowH],
  );

  const nodePool = useMemo(() => {
    const pool = poolSize;
    const items = [];

    // CRITICAL: Reset trackers when pool is recreated to force updateUI
    // to apply styles to the BRAND NEW DOM nodes.
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

  // Synchronize UI whenever the engine or the node pool changes (e.g. on resize)
  useLayoutEffect(() => {
    const el = containerRef.current;
    const st = el ? el.scrollTop : 0;
    updateUI(engine.computeRange(st));
  }, [engine, nodePool, updateUI]);

  // Sync scroll and range
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
        // updateUI is now purely imperative. 0 React renders.
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

  useEffect(() => {
    engine.updateOptions({ totalCount: itemsRef.current.length });
    const el = containerRef.current;
    if (isAtBottomRef.current && followOutput && el) {
      el.scrollTop = el.scrollHeight;
      updateRange(el.scrollTop);
    } else {
      updateRange(el?.scrollTop ?? 0);
    }
  }, [engine, updateRange, followOutput]);

  useImperativeHandle(ref, () => ({
    get element() {
      return containerRef.current;
    },
    scrollToBottom: () => {
      const el = containerRef.current;
      if (el) {
        // Scroll to the end of actual content, ignoring the bottom buffer
        const targetST = Math.max(0, engine.getTotalHeight() - el.clientHeight);
        el.scrollTop = targetST;
        updateRange(targetST);
      }
    },
    appendItems: (newItems: T[], forceScroll?: boolean) => {
      const oldLength = Array.isArray(itemsRef.current) ? itemsRef.current.length : 0;
      console.log("[appendItems] Called with:", newItems.length, "items.");
      console.log("[appendItems] Old length before append:", oldLength);
      
      // 1. Update Internal Ref (Mutable Bypass)
      if (Array.isArray(itemsRef.current)) {
        (itemsRef.current as T[]).push(...newItems);
      } else {
        itemsRef.current = [...(itemsRef.current as any), ...newItems];
      }

      const newLength = itemsRef.current.length;
      console.log("[appendItems] New length after append:", newLength);

      // 2. Synchronize Engine
      engine.updateOptions({ totalCount: newLength });

      // 3. React to changes
      const el = containerRef.current;
      const content = contentRef.current;

      if (el && content) {
        // 3. IMPORTANT: Update the spacer height imperatively
        // because React won't re-render to update the style.height prop!
        const totalSize = engine.getTotalHeight() + bufferHeightRef.current;
        content.style.height = `${totalSize}px`;

        // 4. Calculate target scroll position
        let targetST = el.scrollTop;
        if (forceScroll || (isAtBottomRef.current && followOutput)) {
          // Normal auto-scroll only goes to the end of the ACTUAL messages
          targetST = Math.max(0, engine.getTotalHeight() - el.clientHeight);
          el.scrollTop = targetST;
          console.log("[appendItems] Scroll Forced. targetST:", targetST, "Actual el.scrollTop:", el.scrollTop);
        }

        // 5. Force immediate UI update to catch the new items
        const velocity = engine.getVelocity();
        const next = engine.computeRange(
          targetST,
          engine.getDynamicBuffer(velocity),
        );
        
        console.log("[appendItems] Computed Range:", next.start, "to", next.end);

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
          // 1. Expand buffer to allow scrolling the last item to the top
          bufferHeightRef.current = 800;
          if (content)
            content.style.height = `${engine.getTotalHeight() + 800}px`;

          // 2. Position typing indicator
          const top = engine.getTotalHeight();
          el.style.transform = `translateY(${top}px)`;

          if (autoScroll && container) {
            container.scrollTop = container.scrollHeight;
          }
        } else {
          // 3. Remove buffer when typing finishes
          bufferHeightRef.current = 0;
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
          }
          break;
        }
      }
    },
    updateItem: (index: number, newItem: T) => {
      // 1. Update internal data
      if (Array.isArray(itemsRef.current)) {
        (itemsRef.current as T[])[index] = newItem;
      } else {
        // Handle read-only or ArrayLike if necessary, but usually it's an array we mutate
        (itemsRef.current as any)[index] = newItem;
      }

      // 2. Update DOM if visible
      for (let s = 0; s < poolSize; s++) {
        if (lastIndicesRef.current[s] === index) {
          const slot = refsRef.current[s];
          if (slot) {
            const wrapper = wrapperRefs.current[s];
            slot.update(newItem, index, wrapper, true);
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
      bufferHeightRef.current = height;
      if (contentRef.current) {
        contentRef.current.style.height = `${engine.getTotalHeight() + height}px`;
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
        <div
          ref={contentRef}
          style={{
            height: engine.getTotalHeight(), // No buffer by default
            width: "100%",
            position: "relative",
            marginTop: "auto",
            flexShrink: 0,
          }}
        >
          {nodePool}

        {/* Imperative Typing Indicator (Absolute within Content) */}
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
