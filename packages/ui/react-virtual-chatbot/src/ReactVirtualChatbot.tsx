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
import {
  SCROLL_STOP_DELAY,
  setTextNode,
  VirtualEngine,
  VirtualRange,
} from "virtual-engine";

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
}

export interface ReactVirtualChatbotHandle {
  readonly element: HTMLDivElement | null;
  scrollToBottom: () => void;
  /**
   * Imperatively append messages without triggering a React re-render.
   * @param forceScroll If true, will unconditionally scroll to the bottom.
   */
  appendItems: (newItems: any[], forceScroll?: boolean) => void;
  /**
   * Show/hide a typing indicator ("AI is typing...")
   */
  setTyping: (isVisible: boolean) => void;
  /**
   * Specialized method to imperatively update a specific message's text node.
   * Extremely fast, bypasses React.
   */
  updateMessageText: (index: number, text: string) => void;
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
  }: ReactVirtualChatbotProps<T>,
  ref: React.Ref<ReactVirtualChatbotHandle>,
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const prevScrollTime = useRef(performance.now());
  const isAtBottomRef = useRef(true);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const engine = useMemo(
    () =>
      new VirtualEngine({
        totalCount: itemsRef.current.length,
        itemHeight: rowH,
        viewportHeight: viewH,
        buffer: bufferRow,
      }),
    [rowH, viewH, bufferRow],
  );

  const rangeRef = useRef<VirtualRange>({ start: 0, end: 0 });
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
    (newRange?: VirtualRange) => {
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
          const top = isOutOfRange ? -9999 : i * rowH;

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
        el.scrollTop = el.scrollHeight;
        updateRange(el.scrollTop);
      }
    },
    appendItems: (newItems: T[], forceScroll?: boolean) => {
      // 1. Update Internal Ref (Mutable Bypass)
      if (Array.isArray(itemsRef.current)) {
        (itemsRef.current as T[]).push(...newItems);
      } else {
        itemsRef.current = [...(itemsRef.current as any), ...newItems];
      }

      // 2. Synchronize Engine
      engine.updateOptions({ totalCount: itemsRef.current.length });

      // 3. React to changes
      const el = containerRef.current;
      const content = contentRef.current;
      
      if (el && content) {
        // 3. IMPORTANT: Update the spacer height imperatively 
        // because React won't re-render to update the style.height prop!
        const totalSize = engine.getTotalSize() + 20;
        content.style.height = `${totalSize}px`;

        // 4. Calculate target scroll position
        let targetST = el.scrollTop;
        if (forceScroll || (isAtBottomRef.current && followOutput)) {
          targetST = totalSize - el.clientHeight; // Proper bottom target
          el.scrollTop = targetST;
        }

        // 5. Force immediate UI update to catch the new items
        const velocity = engine.getVelocity();
        const next = engine.computeRange(targetST, engine.getDynamicBuffer(velocity));
        
        rangeRef.current.start = next.start;
        rangeRef.current.end = next.end;
        updateUI(rangeRef.current);
      }
    },
    setTyping: (isVisible: boolean) => {
      const el = typingRef.current;
      const container = containerRef.current;
      if (el) {
        el.style.display = isVisible ? "flex" : "none";
        
        if (isVisible) {
          // Dynamic positioning at the very bottom
          const top = engine.getTotalSize();
          el.style.transform = `translateY(${top}px)`;
          
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }
      }
    },
    updateMessageText: (index: number, text: string) => {
      const slotIdx = index % poolSize;
      if (lastIndicesRef.current[slotIdx] === index) {
        const slot = refsRef.current[slotIdx];
        if (slot) slot.updateText(text);
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
      }}
    >
      <div
        ref={contentRef}
        style={{
          height: engine.getTotalSize() + 20,
          width: "100%",
          position: "relative",
        }}
      >
        {nodePool}

        {/* Imperative Typing Indicator (Absolute within Content) */}
        <div
          ref={typingRef}
          className="typing-indicator-container"
          style={{
            display: "none",
            padding: "10px 20px",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 10,
            pointerEvents: "none",
            alignItems: "center",
          }}
        >
          <div className="typing-indicator-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <span style={{ fontSize: "0.8rem", color: "#666", marginLeft: "8px" }}>
            AI is typing...
          </span>
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
