import React, { memo, useMemo, useRef, useState } from "react";
import { ReactVirtualEngine } from "react-virtual-engine";
import { CodeBlock } from "../../components/CodeBlock";
import { ReactWindowList } from "../../components/ReactWindowList";
import { useSEO } from "../../hooks";

import { FastRow, FastRowData } from "../../components/FastRow";
import { ROW_HEIGH } from "../../constants";
import "./ComparisonPage.scss";

// Pre-calculated pools for zero-overhead streaming
const POOL_SIZE = 20000;
const DELTA_POOL = Array.from({ length: POOL_SIZE }, () => ({
  price: (Math.random() - 0.5) * 10,
  change: (Math.random() - 0.5) * 2,
}));

const ITEM_COUNT_OPTIONS = [10000, 100000, 500000, 1000000];

const veCode = `// 1. FastRow.tsx
export const FastRow = memo(
  forwardRef<IVirtualRowHandle<FastRowData>, FastRowProps>(
    ({ index: initialIndex, data: initialData }, ref) => {
      const indexRef = useRef<HTMLSpanElement>(null);
      const nameRef = useRef<HTMLSpanElement>(null);
      const priceRef = useRef<HTMLSpanElement>(null);

      // Store current data references
      const itemRef = useRef<FastRowData>(initialData);
      const indexValueRef = useRef(initialIndex);

      useImperativeHandle(ref, () => ({
        update: (data, index) => {
          // Identify changes
          const indexChanged = index !== indexValueRef.current;
          const itemChanged = data?.id !== itemRef.current?.id;

          if (indexChanged || itemChanged) {
            indexValueRef.current = index;
            itemRef.current = data;

            // Zero-allocation text mutation
            if (indexRef.current) setTextNode(indexRef.current, \`#\${index}\`);
            if (nameRef.current) setTextNode(nameRef.current, data.name);
            if (priceRef.current) setTextNode(priceRef.current, \`$\${data.price.toFixed(2)}\`);
          }
        },
      }));

      return (
        <>
          <div className="row-left">
            <span ref={indexRef} className="row-index">#{initialIndex}</span>
            <span ref={nameRef} className="row-name">{initialData?.name}</span>
          </div>
          <div className="row-right">
            <span ref={priceRef} className="row-price">\${initialData?.price.toFixed(2)}</span>
          </div>
        </>
      );
    }
  )
);

// 2. Virtual Engine Mount
<ReactVirtualEngine
  items={items}
  itemHeight={ROW_HEIGH}
  height={600}
  rowClass="virtual-row-item"
  renderItem={renderItem}
/>`;

const rwCode = `// 1. RowComponent for React Window
const RowComponent = memo(
  ({ index, items, style }: RowProps) => {
    const item = items[index];
    if (!item) return null;

    // React Re-renders this active component
    // only when the style or index actively shifts.
    return (
      <div style={style} className="rw-row">
        <div className="row-left">
          <span className="row-index">#{index}</span>
          <span className="row-name">{item.name}</span>
        </div>
        <div className="row-right">
          <span className="row-price">\${item.price.toFixed(2)}</span>
          <span className="row-change">
            {item.change.toFixed(2)}%
          </span>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.index === next.index &&
    prev.style === next.style &&
    prev.items[prev.index] === next.items[next.index]
);

// 2. React Window List Mount
<List
  rowComponent={RowComponent}
  rowCount={items.length}
  rowHeight={ROW_HEIGH}
  rowProps={{ items }}
  style={{ height: 600, width: "100%" }}
  className="ve-scrollbar"
/>`;

const VECodeSection = memo(() => (
  <div className="code-section">
    <div className="code-header">Implementation Code</div>
    <CodeBlock code={veCode} />
  </div>
));

const RWCodeSection = memo(() => (
  <div className="code-section">
    <div className="code-header">Implementation Code</div>
    <CodeBlock code={rwCode} />
  </div>
));

const BenchmarkNotes = memo(() => (
  <div className="benchmark-notes">
    <h4 className="notes-title">What to look for:</h4>
    <ul className="notes-list">
      <li className="note-item">
        <span className="note-number">01.</span>
        <span>
          <strong>White Gaps:</strong> Scroll fast and notice how quickly
          Virtual Engine fills content using velocity-aware buffering.
        </span>
      </li>
      <li className="note-item">
        <span className="note-number">02.</span>
        <span>
          <strong>CPU Usage:</strong> Virtual Engine avoids React&apos;s
          &quot;Fiber&quot; reconciliation during scroll, resulting in lower CPU
          spikes.
        </span>
      </li>
      <li className="note-item">
        <span className="note-number">03.</span>
        <span>
          <strong>Interaction:</strong> Try interacting with elements while
          scrolling. Direct DOM updates feel more responsive.
        </span>
      </li>
    </ul>
  </div>
));

export const ComparisonPage: React.FC = () => {
  const [totalItems, setTotalItems] = useState(100000);

  const items = useMemo(() =>
    Array.from({ length: totalItems }, (_, i) => ({
      id: i,
      name: `S-${i}`,
      price: Math.random() * 1000 + 100,
      change: (Math.random() - 0.5) * 5,
      val: Math.floor(Math.random() * 5000) + 1000,
    })),
  [totalItems]);

  const indexMap = useMemo(() => 
    Array.from({ length: totalItems }, (_, i) => i).sort(() => Math.random() - 0.5)
  , [totalItems]);

  const veRef = useRef<any>(null);
  const versionRef = useRef(0);
  const cursorRef = useRef(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [updatesPerSec, setUpdatesPerSec] = useState(0);

  const statsRef = useRef({ count: 0, lastTime: 0 });

  React.useEffect(() => {
    if (!isStreaming) {
      setUpdatesPerSec(0);
      return;
    }

    let rafId: number;
    const loop = (now: number) => {
      if (statsRef.current.lastTime === 0) statsRef.current.lastTime = now;

      // Apply batch updates
      for (let i = 0; i < batchSize; i++) {
        const itemCursor = (cursorRef.current + i) % totalItems;
        const poolCursor = (cursorRef.current + i) % POOL_SIZE;

        const itemIdx = indexMap[itemCursor];
        const item = items[itemIdx];
        const delta = DELTA_POOL[poolCursor];

        if (item) {
          const oldPrice = item.price;
          item.price += delta.price;
          if (item.price < 5) item.price = 100 + Math.random() * 50;
          
          // Calculate realistic percentage change based on price movement
          item.change = ((item.price - oldPrice) / oldPrice) * 100;

          // Update volume (val)
          item.val += Math.floor((Math.random() - 0.4) * 20);
          if (item.val < 100) item.val = 1000 + Math.random() * 500;
        }
      }

      cursorRef.current = (cursorRef.current + batchSize) % totalItems;
      statsRef.current.count += batchSize;

      // Notify Engine
      if (veRef.current) {
        veRef.current.update(items, ++versionRef.current);
      }

      // Update Statistics every second
      const dt = now - statsRef.current.lastTime;
      if (dt >= 1000) {
        setUpdatesPerSec(Math.round((statsRef.current.count * 1000) / dt));
        statsRef.current.count = 0;
        statsRef.current.lastTime = now;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isStreaming, batchSize, items, totalItems, indexMap]);

  useSEO({
    title: "Benchmarks",
    description:
      "Live performance benchmarks comparing React Virtual Engine directly against React Window with 100,000 updating trading rows.",
  });

  const renderItem = useMemo(
    () => (item: unknown, index: number) => (
      <FastRow 
        key={index} 
        index={index} 
        data={item as FastRowData} 
        isStreaming={isStreaming}
      />
    ),
    [isStreaming],
  );

  return (
    <div className="comparison-page">
      <div className="page-header">
        <h2 className="page-title">Performance Showdown</h2>
        <p className="page-subtitle">
          Comparing 100,000 items rendering. Watch the scroll smoothness and
          initialization speed.
        </p>

        <div className="stream-controls">
          <div className="control-group">
            <div className="control-field no-label">
              <label>&nbsp;</label>
              <button
                className={`stream-toggle ${isStreaming ? "active" : ""}`}
                onClick={() => setIsStreaming(!isStreaming)}
              >
                <div className="status-pulse" />
                {isStreaming ? "Stop Live Stream" : "Start Live Stream"}
              </button>
            </div>
            <div className="batch-control">
              <label>Intensity: <span className="intensity-value">{batchSize}</span> items/frame</label>
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                disabled={isStreaming}
              />
            </div>
            <div className="total-control">
              <label>Total Rows</label>
              <select 
                value={totalItems} 
                onChange={(e) => setTotalItems(Number(e.target.value))}
                className="total-select"
                disabled={isStreaming}
              >
                <option value={1000}>1,000 Items</option>
                <option value={5000}>5,000 Items</option>
                <option value={10000}>10,000 Items</option>
                <option value={50000}>50,000 Items</option>
                <option value={100000}>100,000 Items</option>
                <option value={200000}>200,000 Items</option>
                <option value={400000}>400,000 Items (Safe Max)</option>
              </select>
            </div>
          </div>
          <div className="stats-badge">
            <div className="control-field">
              <label>Live Stats</label>
              <div className="stats-content">
                <span className="label">THROUGHPUT:</span>
                <span className="value">{updatesPerSec.toLocaleString()}</span>
                <span className="unit">updates/sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="comparison-grid">
        {/* Virtual Engine Side */}
        <div className="engine-column">
          <div className="column-header">
            <div className="column-title-group">
              <h3 className="column-title brand">
                Virtual Engine (Imperative)
              </h3>
            </div>
            <div className="version-badge">
              <div className="status-dot" />
              <span className="version-text">Optimized</span>
            </div>
          </div>
          <div className="engine-list-container">
            <ReactVirtualEngine
              ref={veRef}
              items={items}
              itemHeight={ROW_HEIGH}
              height={600}
              className="ve-scrollbar"
              rowClass="virtual-row-item"
              renderItem={renderItem}
            />
          </div>
          <p className="engine-footer-note">
            Uses direct DOM manipulation via refs. Zero React state updates
            during scroll.
          </p>
          <VECodeSection />
        </div>

        {/* React Window Side */}
        <div className="engine-column">
          <div className="column-header">
            <div className="column-title-group">
              <h3 className="column-title fallback">
                React Window (Declarative)
              </h3>
              <a
                href="https://react-window.vercel.app/list/fixed-row-height"
                target="_blank"
                rel="noreferrer"
                className="engine-explore-link"
              >
                Explore examples <span>↗</span>
              </a>
            </div>
            <div className="version-badge">
              <span className="version-text">Standard</span>
            </div>
          </div>
          <div className="engine-list-container">
            <ReactWindowList
              items={items}
              itemHeight={ROW_HEIGH}
              height={600}
            />
          </div>
          <p className="engine-footer-note">
            Uses standard React component reconciliation. Each row is a React
            component update.
          </p>
          <RWCodeSection />
        </div>
      </div>

      <BenchmarkNotes />
    </div>
  );
};
