import React, { memo, useMemo, useState } from "react";
import VirtualList from "react-virtual-engine";
import { CodeBlock } from "../components/CodeBlock";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { ReactWindowList } from "../components/ReactWindowList";
import { VirtualRow, VirtualRowData } from "../components/VirtualRow";
import { ROW_HEIGH } from "../constants";

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
<VirtualList
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
  <div className="mt-4 rounded-xl overflow-hidden border border-white/10 text-sm">
    <div className="bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400 border-b border-white/5">
      Implementation Code
    </div>
    <CodeBlock code={veCode} />
  </div>
));

const RWCodeSection = memo(() => (
  <div className="mt-4 rounded-xl overflow-hidden border border-white/10 text-sm">
    <div className="bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400 border-b border-white/5">
      Implementation Code
    </div>
    <CodeBlock code={rwCode} />
  </div>
));

const BenchmarkNotes = memo(() => (
  <div className="mt-12 p-8 glass rounded-md border-white/5 bg-slate-900/40">
    <h4 className="text-white font-bold mb-4">What to look for:</h4>
    <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-400">
      <li className="flex gap-3">
        <span className="text-brand-400 font-bold">01.</span>
        <span>
          <strong>White Gaps:</strong> Scroll fast and notice how quickly
          Virtual Engine fills content using velocity-aware buffering.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="text-brand-400 font-bold">02.</span>
        <span>
          <strong>CPU Usage:</strong> Virtual Engine avoids React&apos;s
          &quot;Fiber&quot; reconciliation during scroll, resulting in lower CPU
          spikes.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="text-brand-400 font-bold">03.</span>
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
    <div className="min-h-screen bg-slate-950">
      <Header />

      <main className="px-6 py-12 max-w-[1400px] mx-auto">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Performance Showdown
          </h2>
          <p className="text-slate-400">
            Comparing 100,000 items rendering. Watch the scroll smoothness and
            initialization speed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Virtual Engine Side */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-xl font-bold text-brand-400">
                Virtual Engine (Imperative)
              </h3>
              <span className="px-3 py-1 bg-brand-400/10 text-brand-400 text-xs font-bold rounded-full border border-brand-400/20">
                Optimized
              </span>
            </div>
            <div className="glass rounded-md overflow-hidden border border-white/5 h-[600px] relative">
              <VirtualList
                items={items}
                itemHeight={ROW_HEIGH}
                height={600}
                className="ve-scrollbar"
                rowClass="pl-6 pr-10 py-2 border-b border-white/5 flex items-center justify-between hover:bg-slate-800/20 cursor-pointer"
                renderItem={renderItem}
              />
            </div>
            <p className="text-xs text-slate-500 px-4">
              Uses direct DOM manipulation via refs. Zero React state updates
              during scroll.
            </p>
            <VECodeSection />
          </div>

          {/* React Window Side */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-xl font-bold text-slate-300">
                React Window (Declarative)
              </h3>
              <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full border border-slate-700">
                Standard
              </span>
            </div>
            <div className="glass rounded-md overflow-hidden border border-white/5 h-[600px] relative">
              <ReactWindowList
                items={items}
                itemHeight={ROW_HEIGH}
                height={600}
              />
            </div>
            <p className="text-xs text-slate-500 px-4">
              Uses standard React component reconciliation. Each row is a React
              component update.
            </p>
            <RWCodeSection />
          </div>
        </div>

        <BenchmarkNotes />
      </main>

      <Footer />
    </div>
  );
};
