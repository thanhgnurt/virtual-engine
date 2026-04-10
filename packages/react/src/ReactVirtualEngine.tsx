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
import { SCROLL_STOP_DELAY, VirtualEngine, VirtualRange } from "virtual-engine";
import { EngineSlot } from "./EngineSlot";

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

export interface ReactVirtualEngineProps<T> {
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

export interface ReactVirtualEngineHandle {
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
const POOL_OVERHEAD = 22; // extra slots for buffer rows + fast-scroll dynamic buffer + safety margin

const HIDDEN_TRANSFORM = "translate(0, -9999px)";
const VISIBILITY_HIDDEN = "hidden";
const VISIBILITY_VISIBLE = "visible";
const TYPE_FUNCTION = "function";

// ─────────────────────────────────────────────
// ReactVirtualEngine
// ─────────────────────────────────────────────

const ReactVirtualEngine = forwardRef(
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
    }: ReactVirtualEngineProps<T>,
    ref: React.ForwardedRef<ReactVirtualEngineHandle>,
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

    const styleHidden = useMemo(
      () => ({
        position: "absolute",
        transform: HIDDEN_TRANSFORM,
        visibility: VISIBILITY_HIDDEN,
        width: "100%",
        contain: "strict",
        height: itemHeight,
        willChange: "transform",
      }),
      [itemHeight],
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

    const transformPoolRef = useRef<Record<number, string>>(
      Object.create(null),
    );
    const getTransform = useCallback((top: number) => {
      const pool = transformPoolRef.current;
      let val = pool[top];
      if (val === undefined) {
        val = "translateY(" + top + "px)";
        pool[top] = val;
      }
      return val;
    }, []);

    const poolSize = useMemo(
      () => Math.min(Math.ceil(height / itemHeight) + POOL_OVERHEAD, MAX_POOL),
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
        const isRowClassFn = typeof rowClass === TYPE_FUNCTION;
        const staticRowClass = isRowClassFn ? "" : rowClass || "";

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
                ? (rowClass as any)(item, i)
                : staticRowClass;

            const wrapper = wrapperRefs.current[s];
            if (wrapper) {
              if (isOutOfRange) {
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
                ? styleHidden
                : {
                    position: "absolute",
                    transform: getTransform(top),
                    width: "100%",
                    height: itemHeight,
                    visibility: VISIBILITY_VISIBLE,
                    contain: "strict",
                    willChange: "transform",
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
                  <EngineSlot<unknown>
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
        getTransform,
        styleHidden,
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
    const lastUpdateTimestampRef = useRef(0);
    const lastVelocityRef = useRef(0);

    const propsRef = useRef({
      externalOnScroll,
      cardIdx,
      paddingVertical,
      itemHeight,
      height,
      performUpdate,
      forceUpdate,
    });
    propsRef.current = {
      externalOnScroll,
      cardIdx,
      paddingVertical,
      itemHeight,
      height,
      performUpdate,
      forceUpdate,
    };

    useLayoutEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const performRafUpdate = () => {
        const currentTop = el.scrollTop;
        const { externalOnScroll, performUpdate, forceUpdate } =
          propsRef.current;

        if (externalOnScroll) externalOnScroll(currentTop);

        const now = performance.now();
        const dt = now - lastUpdateTimestampRef.current;
        let velocity = 0;

        if (dt > 0 && dt < 100) {
          const instantVelocity = engine.calculateVelocity(
            currentTop,
            lastKnownScrollTopRef.current,
            dt,
          );
          velocity = instantVelocity * 0.7 + lastVelocityRef.current * 0.3;
        } else {
          velocity = lastVelocityRef.current;
        }

        lastKnownScrollTopRef.current = currentTop;
        lastUpdateTimestampRef.current = now;
        lastVelocityRef.current = velocity;

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

        if (now - lastScrollTimeRef.current < SCROLL_STOP_DELAY) {
          rafRef.current = requestAnimationFrame(performRafUpdate);
        } else {
          rafRef.current = null;
          lastVelocityRef.current = 0;
          const finalNext = engine.computeRange(currentTop);
          if (
            currentRange.start !== finalNext.start ||
            currentRange.end !== finalNext.end
          ) {
            currentRange.start = finalNext.start;
            currentRange.end = finalNext.end;
            if (performUpdate(currentRange)) forceUpdate();
          }
        }
      };

      const onNativeScroll = () => {
        const now = performance.now();
        lastScrollTimeRef.current = now;
        if (rafRef.current === null) {
          lastUpdateTimestampRef.current = now;
          rafRef.current = requestAnimationFrame(performRafUpdate);
        }
      };

      el.addEventListener("scroll", onNativeScroll, { passive: true });
      return () => {
        el.removeEventListener("scroll", onNativeScroll);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }, [engine]);

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

ReactVirtualEngine.displayName = "ReactVirtualEngine";
export default memo(ReactVirtualEngine) as <T>(
  props: ReactVirtualEngineProps<T> & {
    ref?: React.ForwardedRef<ReactVirtualEngineHandle>;
  },
) => JSX.Element;
