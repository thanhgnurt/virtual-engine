import React, { memo, useMemo, useState } from "react";
import { ReactVirtualEngine } from "react-virtual-engine";
import { CodeBlock } from "../../components/CodeBlock";
import { ReactWindowList } from "../../components/ReactWindowList";

import { VirtualRow, VirtualRowData } from "../../components/VirtualRow";
import { ROW_HEIGH } from "../../constants";
import "./ComparisonPage.scss";

const veCode = `// 1. Imperative Row Update Logic
const VirtualRow = forwardRef(({ index, data }, ref) => {
  const priceRef = useRef(null);

  useImperativeHandle(ref, () => ({
    update: (data, index) => {
      // Engine handles wrapper div positioning automatically
      // Direct DOM Text Mutation
      setTextNode(priceRef.current, \`$\${data.price}\`);
    }
  }));

  return (
    <div>
      <span ref={priceRef}>{data.price}</span>
    </div>
  );
});

// 2. Virtual List Mount
<ReactVirtualEngine
  items={items}
  itemHeight={44}
  height={600}
  bufferRow={5}
  rowClass="pl-6 pr-10 py-2 border-b border-white/5 flex items-center justify-between hover:bg-slate-800/20"
  renderItem={(item, index) => (
    <VirtualRow
      key={index}
      index={index}
      data={item}
    />
  )}
/>`;

const rwCode = `// 1. Declarative Row Render Logic
function RowComponent({ index, items, style }) {
  const item = items[index];

  // React Re-renders component on every scroll tick
  // generating new Virtual DOM allocation.
  return (
    <div style={style}>
      <span>{item.price}</span>
    </div>
  );
}

// 2. React Window List Mount
<List
  rowComponent={RowComponent}
  rowCount={items.length}
  rowHeight={44}
  rowProps={{ items }}
  style={{ height: 600, width: "100%" }}
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
      <VirtualRow key={index} index={index} data={item as VirtualRowData} />
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
            <h3 className="column-title brand">Virtual Engine (Imperative)</h3>
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
            <h3 className="column-title fallback">
              React Window (Declarative)
            </h3>
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
