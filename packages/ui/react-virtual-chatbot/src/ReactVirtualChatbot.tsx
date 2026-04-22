import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { VirtualChatbot, VirtualChatbotRange } from "virtual-chatbot";

export interface ReactVirtualChatbotProps<T> {
  items: ArrayLike<T>;
  estimatedItemHeight: number;
  height?: number;
  width?: string | number;
  bufferRow?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  followOutput?: boolean;
}

export interface ReactVirtualChatbotHandle {
  readonly element: HTMLDivElement | null;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

const MAX_POOL = 128;
const POOL_OVERHEAD = 10;

export const ReactVirtualChatbot = forwardRef(
  <T,>(
    {
      items,
      estimatedItemHeight: eh,
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
    const [, _sync] = useReducer((v: number) => v + 1, 0);
    const sync = useCallback(() => _sync(), []);

    const engine = useMemo(
      () =>
        new VirtualChatbot({
          totalCount: items.length,
          estimatedItemHeight: eh,
          viewportHeight: viewH,
          buffer: bufferRow,
        }),
      [eh, viewH, bufferRow],
    );

    // Update engine when items length changes
    useEffect(() => {
      engine.updateOptions({ totalCount: items.length });
      sync();
    }, [items.length, engine, sync]);

    const rangeRef = useRef<VirtualChatbotRange>({ start: 0, end: 0 });
    const poolSize = useMemo(
      () => engine.getPoolSize(POOL_OVERHEAD, MAX_POOL),
      [engine],
    );

    const updateRange = useCallback(() => {
      if (!containerRef.current) return;
      const next = engine.computeRange(containerRef.current.scrollTop);
      if (next.changed) {
        rangeRef.current.start = next.start;
        rangeRef.current.end = next.end;
        sync();
      }
    }, [engine, sync]);

    useLayoutEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const onScroll = () => updateRange();
      el.addEventListener("scroll", onScroll, { passive: true });
      updateRange();
      return () => el.removeEventListener("scroll", onScroll);
    }, [updateRange]);

    // Handle stick-to-bottom
    const isAtBottomRef = useRef(true);
    useLayoutEffect(() => {
      if (followOutput && isAtBottomRef.current) {
        const el = containerRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }
    }, [items.length, followOutput]);

    // ResizeObserver logic
    const observersRef = useRef<Map<number, ResizeObserver>>(new Map());

    const measureRef = useCallback(
      (node: HTMLDivElement | null, index: number) => {
        if (!node) return;

        // Cleanup old observer for this node if any
        // (In this simple impl, we attach observer per mapped item)
        const existing = observersRef.current.get(index);
        if (existing) existing.disconnect();

        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const height = entry.contentRect.height;
            if (engine.setHeight(index, height)) {
              sync();
            }
          }
        });
        ro.observe(node);
        observersRef.current.set(index, ro);
      },
      [engine, sync],
    );

    useImperativeHandle(ref, () => ({
      get element() {
        return containerRef.current;
      },
      scrollToBottom: (behavior = "auto") => {
        const el = containerRef.current;
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior });
        }
      },
    }));

    const renderPool = () => {
      const { start, end } = rangeRef.current;
      const pool = [];
      for (let i = start; i <= end; i++) {
        const item = items[i];
        if (!item) continue;

        pool.push(
          <div
            key={i}
            ref={(el) => measureRef(el, i)}
            style={{
              position: "absolute",
              top: engine.getOffset(i),
              width: "100%",
            }}
          >
            {renderItem(item, i)}
          </div>,
        );
      }
      return pool;
    };

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          height: viewH,
          width,
          overflow: "auto",
          position: "relative",
        }}
      >
        <div
          ref={contentRef}
          style={{
            height: engine.getTotalHeight(),
            width: "100%",
            position: "relative",
          }}
        >
          {renderPool()}
        </div>
      </div>
    );
  },
);

ReactVirtualChatbot.displayName = "ReactVirtualChatbot";
