import React from "react";
import { ReactVirtualEngine } from "react-virtual-engine";
import { CodeBlock } from "../../components/CodeBlock";
import { useSEO } from "../../hooks";
import "./QuickStartPage.scss";

const installCode = `npm install react-virtual-engine`;

const basicUsageCode = `import { ReactVirtualEngine } from "react-virtual-engine";

function MyList() {
  const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: \`Item \${i}\` }));

  return (
    <ReactVirtualEngine
      items={items}
      itemHeight={50}
      height={500}
      renderItem={(item, index) => (
        <div key={index} className="list-row">
          {item.name}
        </div>
      )}
    />
  );
}`;

const advancedUsageCode = `import { ReactVirtualEngine, setTextNode, type IVirtualRowHandle } from "react-virtual-engine";
import { forwardRef, useImperativeHandle, useRef, memo } from "react";

interface ItemData {
  id: number;
  name: string;
}

interface FastRowProps {
  index: number;
  data: ItemData;
}

const FastRow = memo(
  forwardRef<IVirtualRowHandle<ItemData>, FastRowProps>(({ index, data }, ref) => {
    const nameRef = useRef<HTMLSpanElement>(null);

    useImperativeHandle(ref, () => ({
      update: (newData, newIndex) => {
        // Zero-allocation update: bypassing React's render phase
        if (nameRef.current) {
          setTextNode(nameRef.current, newData.name);
        }
      },
    }));

    return (
      <div className="list-row">
        <span ref={nameRef}>{data.name}</span>
      </div>
    );
  })
);

function MyList() {
  const items: ItemData[] = Array.from({ length: 100000 }, (_, i) => ({ id: i, name: \`Item \${i}\` }));

  return (
    <ReactVirtualEngine
      items={items}
      itemHeight={50}
      height={500}
      renderItem={(item, index) => <FastRow index={index} data={item} />}
    />
  );
}`;

export const QuickStartPage: React.FC = () => {
  useSEO({
    title: "Quick Start",
    description:
      "Learn how to easily install and implement React Virtual Engine with step-by-step guides for both standard React usage and extreme-scale zero-allocation patterns.",
  });

  return (
    <div className="quick-start-page">
      <div className="page-header">
        <h1 className="page-title">Quick Start Guide</h1>
        <p className="page-subtitle">
          Get up and running with Virtual Engine in less than 2 minutes.
        </p>
      </div>

      <div className="content-section">
        <h2 className="section-title">1. Installation</h2>
        <p className="section-desc">
          Add Virtual Engine to your project using npm or yarn. It has zero
          external dependencies besides React.
        </p>
        <CodeBlock code={installCode} inline />
      </div>

      <div className="content-section">
        <h2 className="section-title">2. Basic Usage (Standard React)</h2>
        <p className="section-desc">
          For simple lists where maximum framerate isn't mission-critical, you
          can write idiomatic React components.
        </p>
        <CodeBlock code={basicUsageCode} />
      </div>

      <div className="content-section">
        <h2 className="section-title">3. High Performance (Zero-Allocation)</h2>
        <p className="section-desc">
          To achieve 60 FPS under extreme scale, use the \`ref\` +
          \`useImperativeHandle\` pattern. This bypasses the React render phase
          completely.
        </p>
        <CodeBlock code={advancedUsageCode} />
      </div>

      <div className="content-section">
        <h2 className="section-title">4. Key Concepts</h2>
        <div className="concepts-grid">
          <div className="concept-card">
            <h3 className="concept-name">Slot Recycling</h3>
            <p className="concept-text">
              Instead of rendering thousands of nodes, we reuse a tiny fixed set
              of DOM elements.
            </p>
          </div>
          <div className="concept-card">
            <h3 className="concept-name">Zero Latency</h3>
            <p className="concept-text">
              We bypass React re-renders during high-speed scrolling for buttery
              smooth 60fps.
            </p>
          </div>
          <div className="concept-card">
            <h3 className="concept-name">Scoped Pooling</h3>
            <p className="concept-text">
              Built-in memory management ensures zero allocations during heavy
              interactive tasks.
            </p>
          </div>
        </div>
      </div>

      <div className="content-section next-steps">
        <h2 className="section-title">Next Steps</h2>
        <div className="next-steps-container">
          <p className="section-desc">
            Now that you have the basic list running, you might want to:
          </p>
          <div className="steps-links">
            <a href="/benchmarks" className="step-link secondary">
              <span className="step-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              </span>
              <div className="step-info">
                <span className="step-name">View Benchmarks</span>
                <span className="step-note">
                  See how we compare to react-window.
                </span>
              </div>
            </a>
            <a
              href="https://github.com/thanhgnurt/virtual-engine"
              target="_blank"
              rel="noreferrer"
              className="step-link secondary"
            >
              <span className="step-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <div className="step-info">
                <span className="step-name">Star on GitHub</span>
                <span className="step-note">
                  Support the project and stay updated.
                </span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
