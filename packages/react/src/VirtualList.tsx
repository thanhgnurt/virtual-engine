import {
  SCROLL_STOP_DELAY,
  VirtualEngine,
  VirtualRange,
} from "virtual-engine";
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
import { VirtualItem } from "./VirtualItem";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface IVirtualRowHandle<T = unknown> {
  update: (
    item: T,
    index: number,
    cardIdx: number,
    rowElement: HTMLDivElement | null,
    version?: number,
    isLast?: boolean,
    isFirst?: boolean,
  ) => void;
}

export interface VirtualListProps<T> {
  items: ArrayLike<T>;
  itemHeight: number;
  height?: number;
  width?: string | number;
  bufferRow?: number;
  className?: string;
  rowClass?: string | ((item: T, index: number) => string);
  style?: React.CSSProperties;
  version?: number;
  onScroll?: (scrollTop: number) => void;
  renderItem: (
    item: T,
    index: number,
  ) => React.ReactElement<{ ref?: React.Ref<IVirtualRowHandle<T>> }>;
  role?: string;
  cardIdx?: number;
  paddingVertical?: number;
}

export interface VirtualListHandle {
  readonly element: HTMLDivElement | null;
  scrollToRow: (config: {
    align?: "auto" | "center" | "end" | "start" | "smart";
    behavior?: "auto" | "smooth" | "instant";
    index: number;
  }) => void;
  update: (items: ArrayLike<unknown>, version?: number) => void;
  syncScrollTop: (scrollTop: number) => void;
  snapshotScroll: () => void;
  restoreScroll: () => void;
  updateViewportHeight: (newHeight: number) => void;
}

const MAX_POOL = 256;

const HIDDEN_TRANSFORM = "translate(0, -9999px)";
const VISIBILITY_HIDDEN = "hidden";
const VISIBILITY_VISIBLE = "visible";
const TYPE_FUNCTION = "function";

const STYLE_HIDDEN: React.CSSProperties = Object.freeze({
  position: "absolute",
  transform: HIDDEN_TRANSFORM,
  visibility: VISIBILITY_HIDDEN,
  width: "100%",
  contain: "strict",
});

// ─────────────────────────────────────────────
// VirtualList
// ─────────────────────────────────────────────

const VirtualList = forwardRef(
  <T,>(
    {
      version,
      items,
      itemHeight,
      height = 600,
      width = "100%",
      bufferRow = 0,
      className,
      rowClass,
      style: externalStyle,
      onScroll: externalOnScroll,
      renderItem,
      role,
      cardIdx,
      paddingVertical = 0,
    }: VirtualListProps<T>,
    ref: React.ForwardedRef<VirtualListHandle>,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const rafRef = useRef<number | null>(null);

    const engine = useMemo(
      () =>
        new VirtualEngine({
          totalCount: items.length,
          itemHeight,
          viewportHeight: height,
          buffer: bufferRow,
        }),
      [itemHeight, height, bufferRow],
    );

    const [, _forceUpdate] = useReducer((v: number) => v + 1, 0);
    const forceUpdate = useCallback(() => _forceUpdate(), []);

    const itemsRef = useRef(items);
    itemsRef.current = items;

    const versionRef = useRef(version);
    versionRef.current = version;

    const rangeRef = useRef<VirtualRange>({ start: 0, end: 0 });
    const isFirstRangeRef = useRef(true);
    if (isFirstRangeRef.current) {
      const r = engine.computeRange(0);
      rangeRef.current.start = r.start;
      rangeRef.current.end = r.end;
      isFirstRangeRef.current = false;
    }

    const slotMapRef = useRef<Int32Array>(new Int32Array(MAX_POOL));

    const nodesRef = useRef<React.ReactNode[]>(new Array(MAX_POOL).fill(null));
    const itemRefs = useRef<(unknown | null)[]>(new Array(MAX_POOL).fill(null));
    const lastIdsRef = useRef<unknown[]>(new Array(MAX_POOL).fill(null));
    const lastVersionsRef = useRef<Int32Array>(
      new Int32Array(MAX_POOL).fill(-2),
    );
    const wrapperRefs = useRef<(HTMLDivElement | null)[]>(
      new Array(MAX_POOL).fill(null),
    );
    const lastIndicesRef = useRef<Int32Array>(
      new Int32Array(MAX_POOL).fill(-2),
    );
    const lastTopsRef = useRef<Float32Array>(
      new Float32Array(MAX_POOL).fill(-2),
    );
    const lastCardIdxsRef = useRef<Int32Array>(
      new Int32Array(MAX_POOL).fill(-2),
    );

    const transformPoolRef = useRef<Record<number, string>>({});

    const poolSize = useMemo(
      () => Math.min(Math.ceil(height / itemHeight) + 22, MAX_POOL),
      [height, itemHeight],
    );

    const performUpdate = useCallback(
      (
        newRange?: VirtualRange,
        currentVersion?: number,
        currentItems?: ArrayLike<T>,
      ) => {
        const range = newRange || rangeRef.current;
        const nodes = nodesRef.current;
        const refs = itemRefs.current;
        const ver = currentVersion ?? versionRef.current ?? -1;
        const its = currentItems ?? itemsRef.current;
        const slotMap = engine.getSlotMap(range, poolSize, slotMapRef.current);
        const transformPool = transformPoolRef.current;

        const isRowClassFn = typeof rowClass === TYPE_FUNCTION;
        const staticRowClass = isRowClassFn ? "" : rowClass || "";

        const getTransform = (top: number) => {
          let val = transformPool[top];
          if (val === undefined) {
            val = `translateY(${top}px)`;
            transformPool[top] = val;
          }
          return val;
        };

        let needsRerender = false;

        for (let s = 0; s < poolSize; s++) {
          const i = slotMap[s];
          const isOutOfRange = i === -1;
          const top = isOutOfRange ? -9999 : i * itemHeight + paddingVertical;
          const item = isOutOfRange ? null : its[i];

          const isChanged =
            lastIdsRef.current[s] !== item ||
            lastVersionsRef.current[s] !== ver ||
            lastIndicesRef.current[s] !== i ||
            lastTopsRef.current[s] !== top ||
            lastCardIdxsRef.current[s] !== (cardIdx ?? -1);

          if (isChanged) {
            const customClass = isOutOfRange
              ? ""
              : isRowClassFn
                ? (rowClass as Function)(item, i)
                : staticRowClass;

            const wrapper = wrapperRefs.current[s];
            if (wrapper) {
              if (isOutOfRange) {
                // Performance: Do not clear className to avoid style recalculation thrashing
                wrapper.style.transform = HIDDEN_TRANSFORM;
                wrapper.style.visibility = VISIBILITY_HIDDEN;
              } else {
                if (wrapper.className !== customClass) {
                  wrapper.className = customClass;
                }
                wrapper.style.transform = getTransform(top);
                wrapper.style.visibility = VISIBILITY_VISIBLE;
              }
            }

            const currentRef = refs[s] as {
              update?: (...args: unknown[]) => void;
            } | null;
            if (currentRef && typeof currentRef.update === "function") {
              currentRef.update(
                item,
                i,
                cardIdx ?? -1,
                wrapper,
                ver,
                i === its.length - 1,
                i === 0,
              );
              lastIdsRef.current[s] = item;
              lastVersionsRef.current[s] = ver;
              lastIndicesRef.current[s] = i;
              lastTopsRef.current[s] = top;
              lastCardIdxsRef.current[s] = cardIdx ?? -1;
            } else {
              const initStyle = isOutOfRange
                ? STYLE_HIDDEN
                : {
                    position: "absolute",
                    transform: getTransform(top),
                    width: "100%",
                    height: itemHeight,
                    visibility: VISIBILITY_VISIBLE,
                    contain: "strict",
                  };

              nodes[s] = (
                <div
                  key={s}
                  ref={(r: HTMLDivElement | null) => {
                    wrapperRefs.current[s] = r;
                  }}
                  className={customClass}
                  style={initStyle as React.CSSProperties}
                >
                  <VirtualItem<unknown>
                    ref={(r: unknown) => {
                      refs[s] = r;
                    }}
                    index={i}
                    data={item}
                    version={ver}
                    renderItem={
                      renderItem as unknown as (
                        item: unknown,
                        index: number,
                      ) => React.ReactElement
                    }
                  />
                </div>
              );
              needsRerender = true;
            }
          }
        }

        for (let s = poolSize; s < MAX_POOL; s++) {
          if (refs[s] !== null) {
            if (nodes[s] !== null) {
              nodes[s] = null;
              needsRerender = true;
            }
            refs[s] = null;
          }
        }

        return needsRerender;
      },
      [
        engine,
        poolSize,
        itemHeight,
        paddingVertical,
        cardIdx,
        renderItem,
        rowClass,
      ],
    );

    const isFirstRenderHandleRef = useRef(true);
    if (isFirstRenderHandleRef.current) {
      performUpdate(rangeRef.current, versionRef.current, itemsRef.current);
      isFirstRenderHandleRef.current = false;
    }

    useEffect(() => {
      engine.updateOptions({ totalCount: items.length });
      const next = engine.computeRange(containerRef.current?.scrollTop ?? 0);
      rangeRef.current.start = next.start;
      rangeRef.current.end = next.end;
      performUpdate(rangeRef.current);
      forceUpdate();
    }, [
      items.length,
      itemHeight,
      height,
      bufferRow,
      engine,
      performUpdate,
      forceUpdate,
    ]);

    useEffect(() => {
      performUpdate(rangeRef.current, version, items);
      forceUpdate();
    }, [items, version, poolSize, performUpdate, forceUpdate]);

    useImperativeHandle(
      ref,
      () => ({
        get element() {
          return containerRef.current;
        },
        update: (newItems, newVersion) => {
          itemsRef.current = newItems as ArrayLike<T>;
          if (newVersion !== undefined) versionRef.current = newVersion;
          engine.updateOptions({ totalCount: newItems.length });
          const next = engine.computeRange(
            containerRef.current?.scrollTop ?? 0,
          );
          rangeRef.current.start = next.start;
          rangeRef.current.end = next.end;
          if (
            performUpdate(
              rangeRef.current,
              versionRef.current,
              newItems as ArrayLike<T>,
            )
          )
            forceUpdate();
        },
        scrollToRow: ({ index, align = "auto", behavior = "auto" }) => {
          const el = containerRef.current;
          if (!el) return;
          const itemTop = index * itemHeight + paddingVertical;
          let top: number;
          switch (align) {
            case "start":
              top = itemTop;
              break;
            case "end":
              top = itemTop - height + itemHeight;
              break;
            case "center":
              top = itemTop - height / 2 + itemHeight / 2;
              break;
            default: {
              const isAbove = itemTop < el.scrollTop;
              const isBelow = itemTop + itemHeight > el.scrollTop + height;
              if (!isAbove && !isBelow) return;
              top = isAbove ? itemTop : itemTop - height + itemHeight;
            }
          }
          el.scrollTo({
            top: Math.max(0, top),
            behavior: behavior as ScrollBehavior,
          });
        },
        syncScrollTop: (scrollTop) => {
          const el = containerRef.current;
          if (!el) return;
          el.scrollTop = scrollTop;
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          const next = engine.computeRange(scrollTop);
          rangeRef.current.start = next.start;
          rangeRef.current.end = next.end;
          if (performUpdate(rangeRef.current)) forceUpdate();
        },
        snapshotScroll: () => {},
        restoreScroll: () => {},
        updateViewportHeight: (newHeight) => {
          engine.updateOptions({ viewportHeight: newHeight });
          const next = engine.computeRange(
            containerRef.current?.scrollTop ?? 0,
          );
          rangeRef.current.start = next.start;
          rangeRef.current.end = next.end;
          if (performUpdate(rangeRef.current)) forceUpdate();
        },
      }),
      [engine, itemHeight, height, paddingVertical, performUpdate, forceUpdate],
    );

    const lastKnownScrollTopRef = useRef(0);
    const lastScrollTimeRef = useRef(0);
    const scrollStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

    // Pre-allocated range for scroll-stop check
    useLayoutEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const onScrollStop = () => {
        const next = engine.computeRange(el.scrollTop);
        const nextStart = next.start;
        const nextEnd = next.end;
        if (
          rangeRef.current.start !== nextStart ||
          rangeRef.current.end !== nextEnd
        ) {
          rangeRef.current.start = nextStart;
          rangeRef.current.end = nextEnd;
          if (performUpdate(rangeRef.current)) forceUpdate();
        }
      };

      const checkScrollStop = () => {
        if (
          performance.now() - lastScrollTimeRef.current >=
          SCROLL_STOP_DELAY
        ) {
          scrollStopTimerRef.current = null;
          onScrollStop();
        } else {
          scrollStopTimerRef.current = setTimeout(
            checkScrollStop,
            SCROLL_STOP_DELAY,
          );
        }
      };

      const performRafUpdate = () => {
        const currentTop = el.scrollTop;
        if (externalOnScroll) externalOnScroll(currentTop);
        const now = performance.now();
        const dt = now - lastScrollTimeRef.current;
        const velocity = engine.calculateVelocity(
          currentTop,
          lastKnownScrollTopRef.current,
          dt,
        );
        lastKnownScrollTopRef.current = currentTop;
        lastScrollTimeRef.current = now;

        if (scrollStopTimerRef.current === null) {
          scrollStopTimerRef.current = setTimeout(
            checkScrollStop,
            SCROLL_STOP_DELAY,
          );
        }

        // Apply hysteresis to extraBuffer to avoid range "jitter"
        const extraBuffer = engine.getDynamicBuffer(velocity);
        const currentRange = rangeRef.current;
        const next = engine.computeRange(currentTop, extraBuffer);
        const nextStart = next.start;
        const nextEnd = next.end;

        if (currentRange.start !== nextStart || currentRange.end !== nextEnd) {
          currentRange.start = nextStart;
          currentRange.end = nextEnd;
          if (performUpdate(currentRange)) forceUpdate();
        }
        rafRef.current = null;
      };

      const onNativeScroll = () => {
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(performRafUpdate);
      };
      el.addEventListener("scroll", onNativeScroll, { passive: true });
      return () => {
        el.removeEventListener("scroll", onNativeScroll);
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        if (scrollStopTimerRef.current !== null) {
          clearTimeout(scrollStopTimerRef.current);
        }
      };
    }, [engine, performUpdate, forceUpdate, externalOnScroll]);

    return (
      <div
        ref={containerRef}
        style={{
          height,
          width,
          overflow: "auto",
          overflowX: "hidden",
          position: "relative",
          ...externalStyle,
        }}
        className={className}
        role={role}
      >
        <div
          style={{
            height: engine.getTotalSize(paddingVertical),
            width: "100%",
            position: "relative",
          }}
        >
          {nodesRef.current}
        </div>
      </div>
    );
  },
);

VirtualList.displayName = "VirtualList";
export default memo(VirtualList) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<VirtualListHandle> },
) => JSX.Element;
