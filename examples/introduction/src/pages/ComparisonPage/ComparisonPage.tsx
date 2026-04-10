import React, { memo, useMemo, useState } from "react";
import { ReactVirtualEngine } from "react-virtual-engine";
import { CodeBlock } from "../../components/CodeBlock";
import { ReactWindowList } from "../../components/ReactWindowList";
import { useSEO } from "../../hooks";

import { FastRow, FastRowData } from "../../components/FastRow";
import { ROW_HEIGH } from "../../constants";
import "./ComparisonPage.scss";

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

const ITEM_COUNT = 100000;

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
  useSEO({
    title: "Benchmarks",
    description:
      "Live performance benchmarks comparing React Virtual Engine directly against React Window with 100,000 updating trading rows.",
  });

  const [items] = useState(() =>
    Array.from({ length: ITEM_COUNT }, (_, i) => ({
      id: i,
      name: `Stock ${i}`,
      price: Math.random() * 1000 + 100,
      change: (Math.random() - 0.5) * 5,
    })),
  );

  const renderItem = useMemo(
    () => (item: unknown, index: number) => (
      <FastRow key={index} index={index} data={item as FastRowData} />
    ),
    [],
  );

  return (
    <div className="comparison-page">
      <div className="page-header">
        <h2 className="page-title">Performance Showdown</h2>
        <p className="page-subtitle">
          Comparing 100,000 items rendering. Watch the scroll smoothness and
          initialization speed.
        </p>
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
