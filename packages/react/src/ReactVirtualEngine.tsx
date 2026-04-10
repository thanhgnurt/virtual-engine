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
  release?: () => void;
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
const POOL_OVERHEAD = 22;

const HIDDEN_TRANSFORM = "translate(0, -9999px)";
const VISIBILITY_HIDDEN = "hidden";
const VISIBILITY_VISIBLE = "visible";
const TYPE_FUNCTION = "function";
const ABSOLUTE = "absolute";
const W_100 = "100%";
const STRICT = "strict";
const TRANSFORM = "transform";

// ─────────────────────────────────────────────
// ReactVirtualEngine
// ─────────────────────────────────────────────

const ReactVirtualEngine = forwardRef(
  <T,>(
    {
      version,
      items,
      itemHeight: rowH,
      height: viewH = 600,
      width = W_100,
      bufferRow = 0,
      className,
      rowClass,
      style: externalStyle,
      onScroll: onScrollEx,
      renderItem,
      role,
      cardIdx,
      paddingVertical: padY = 0,
    }: ReactVirtualEngineProps<T>,
    ref: React.ForwardedRef<ReactVirtualEngineHandle>,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rafId = useRef<number | null>(null);

    const engine = useMemo(
      () =>
        new VirtualEngine({
          totalCount: items.length,
          itemHeight: rowH,
          viewportHeight: viewH,
          buffer: bufferRow,
        }),
      [rowH, viewH, bufferRow],
    );

    const styleHidden = useMemo(
      () => ({
        position: ABSOLUTE,
        transform: HIDDEN_TRANSFORM,
        visibility: VISIBILITY_HIDDEN,
        width: W_100,
        contain: STRICT,
        height: rowH,
        willChange: TRANSFORM,
      }),
      [rowH],
    );

    const [, _sync] = useReducer((v: number) => v + 1, 0);
    const sync = useCallback(() => _sync(), []);

    const itemsRef = useRef(items);
    itemsRef.current = items;

    const versionRef = useRef(version);
    versionRef.current = version;

    const rangeRef = useRef<VirtualRange>({ start: 0, end: 0 });
    const initRange = useRef(true);
    if (initRange.current) {
      const r = engine.computeRange(0);
      rangeRef.current.start = r.start;
      rangeRef.current.end = r.end;
      initRange.current = false;
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
      () => Math.min(Math.ceil(viewH / rowH) + POOL_OVERHEAD, MAX_POOL),
      [viewH, rowH],
    );

    const updateUI = useCallback(
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
          const top = isOutOfRange ? -9999 : i * rowH + padY;
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
              release?: () => void;
            } | null;
            if (currentRef) {
              if (isOutOfRange) {
                if (typeof currentRef.release === TYPE_FUNCTION) {
                  currentRef.release();
                }
              } else if (typeof currentRef.update === TYPE_FUNCTION) {
                currentRef.update(
                  item,
                  i,
                  cardIdx ?? -1,
                  wrapper,
                  ver,
                  i === its.length - 1,
                  i === 0,
                );
              }
              lastIdsRef.current[s] = item;
              lastVersionsRef.current[s] = ver;
              lastIndicesRef.current[s] = i;
              lastTopsRef.current[s] = top;
              lastCardIdxsRef.current[s] = cardIdx ?? -1;
            } else {
              const initStyle = isOutOfRange
                ? styleHidden
                : {
                    position: ABSOLUTE,
                    transform: getTransform(top),
                    width: W_100,
                    height: rowH,
                    visibility: VISIBILITY_VISIBLE,
                    contain: STRICT,
                    willChange: TRANSFORM,
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
        rowH,
        padY,
        cardIdx,
        renderItem,
        rowClass,
        getTransform,
        styleHidden,
      ],
    );

    const initHandle = useRef(true);
    if (initHandle.current) {
      updateUI(rangeRef.current, versionRef.current, itemsRef.current);
      initHandle.current = false;
    }

    useEffect(() => {
      engine.updateOptions({ totalCount: items.length });
      const next = engine.computeRange(containerRef.current?.scrollTop ?? 0);
      rangeRef.current.start = next.start;
      rangeRef.current.end = next.end;
      updateUI(rangeRef.current);
      sync();
    }, [
      items.length,
      rowH,
      viewH,
      bufferRow,
      engine,
      updateUI,
      sync,
    ]);

    useEffect(() => {
      updateUI(rangeRef.current, version, items);
      sync();
    }, [items, version, poolSize, updateUI, sync]);

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
            updateUI(
              rangeRef.current,
              versionRef.current,
              newItems as ArrayLike<T>,
            )
          )
            sync();
        },
        scrollToRow: ({ index, align = "auto", behavior = "auto" }) => {
          const el = containerRef.current;
          if (!el) return;
          const itemTop = index * rowH + padY;
          let top: number;
          switch (align) {
            case "start":
              top = itemTop;
              break;
            case "end":
              top = itemTop - viewH + rowH;
              break;
            case "center":
              top = itemTop - viewH / 2 + rowH / 2;
              break;
            default: {
              const isAbove = itemTop < el.scrollTop;
              const isBelow = itemTop + rowH > el.scrollTop + viewH;
              if (!isAbove && !isBelow) return;
              top = isAbove ? itemTop : itemTop - viewH + rowH;
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
          if (rafId.current !== null) {
            cancelAnimationFrame(rafId.current);
            rafId.current = null;
          }
          const next = engine.computeRange(scrollTop);
          rangeRef.current.start = next.start;
          rangeRef.current.end = next.end;
          if (updateUI(rangeRef.current)) sync();
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
          if (updateUI(rangeRef.current)) sync();
        },
      }),
      [engine, rowH, viewH, padY, updateUI, sync],
    );

    const prevScrollTop = useRef(0);
    const prevScrollTime = useRef(0);
    const prevTS = useRef(0);
    const prevV = useRef(0);

    const propsRef = useRef({
      onScrollEx,
      cardIdx,
      padY,
      rowH,
      viewH,
      updateUI,
      sync,
    });
    propsRef.current = {
      onScrollEx,
      cardIdx,
      padY,
      rowH,
      viewH,
      updateUI,
      sync,
    };

    useLayoutEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const onRafUpdate = () => {
        const currentTop = el.scrollTop;
        const { onScrollEx, updateUI, sync } =
          propsRef.current;

        if (onScrollEx) onScrollEx(currentTop);

        const now = performance.now();
        const dt = now - prevTS.current;
        let velocity = 0;

        if (dt > 0 && dt < 100) {
          const instantVelocity = engine.calculateVelocity(
            currentTop,
            prevScrollTop.current,
            dt,
          );
          velocity = instantVelocity * 0.7 + prevV.current * 0.3;
        } else {
          velocity = prevV.current;
        }

        prevScrollTop.current = currentTop;
        prevTS.current = now;
        prevV.current = velocity;

        const extraBuffer = engine.getDynamicBuffer(velocity);
        const currentRange = rangeRef.current;
        const next = engine.computeRange(currentTop, extraBuffer);
        const nextStart = next.start;
        const nextEnd = next.end;

        if (currentRange.start !== nextStart || currentRange.end !== nextEnd) {
          currentRange.start = nextStart;
          currentRange.end = nextEnd;
          if (updateUI(currentRange)) sync();
        }

        if (now - prevScrollTime.current < SCROLL_STOP_DELAY) {
          rafId.current = requestAnimationFrame(onRafUpdate);
        } else {
          rafId.current = null;
          prevV.current = 0;
          const finalNext = engine.computeRange(currentTop);
          if (
            currentRange.start !== finalNext.start ||
            currentRange.end !== finalNext.end
          ) {
            currentRange.start = finalNext.start;
            currentRange.end = finalNext.end;
            if (updateUI(currentRange)) sync();
          }
        }
      };

      const onNativeScroll = () => {
        const now = performance.now();
        prevScrollTime.current = now;
        if (rafId.current === null) {
          prevTS.current = now;
          rafId.current = requestAnimationFrame(onRafUpdate);
        }
      };

      el.addEventListener("scroll", onNativeScroll, { passive: true });
      return () => {
        el.removeEventListener("scroll", onNativeScroll);
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
      };
    }, [engine]);

    return (
      <div
        ref={containerRef}
        style={{
          height: viewH,
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
            height: engine.getTotalSize(padY),
            width: W_100,
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
