import React from "react";
import { CodeBlock } from "../../components/CodeBlock";
import { useSEO } from "../../hooks";
import "./ApiPage.scss";

const propsCode = `export interface ReactVirtualEngineProps<T> {
  // Required
  items: ArrayLike<T>;
  itemHeight: number;
  renderItem: (
    item: T,
    index: number,
  ) => React.ReactElement<{ ref?: React.Ref<IVirtualRowHandle<T>> }>;

  // Optional Performance & Layout
  height?: number; // default: 600
  width?: string | number; // default: "100%"
  bufferRow?: number; // default: 0
  paddingVertical?: number; // default: 0

  // Optional Styling & Metadata
  className?: string;
  rowClass?: string | ((item: T, index: number) => string);
  style?: React.CSSProperties;
  role?: string;
  
  // Optional Callbacks & Controls
  onScroll?: (scrollTop: number) => void;
  version?: number;
  cardIdx?: number;
}`;

const handleCode = `export interface ReactVirtualEngineHandle {
  readonly element: HTMLDivElement | null;
  
  // imperative scroll
  scrollToRow: (config: {
    index: number;
    align?: "auto" | "center" | "end" | "start" | "smart";
    behavior?: "auto" | "smooth" | "instant";
  }) => void;
  
  // manual state injection
  update: (items: ArrayLike<unknown>, version?: number) => void;
  syncScrollTop: (scrollTop: number) => void;
  updateViewportHeight: (newHeight: number) => void;
  
  // memory snapshots
  snapshotScroll: () => void;
  restoreScroll: () => void;
}`;

const rowHandleCode = `export interface IVirtualRowHandle<T = unknown> {
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
}`;

export const ApiPage: React.FC = () => {
  useSEO({
    title: "API Reference",
    description:
      "Comprehensive documentation of the ReactVirtualEngine interfaces, props, and expose ref methods.",
  });

  return (
    <div className="api-page">
      <div className="page-header">
        <h1 className="page-title">API Reference</h1>
        <p className="page-subtitle">
          Comprehensive documentation of the ReactVirtualEngine interfaces and
          methods.
        </p>
      </div>

      <div className="content-section">
        <h2 className="section-title">Props</h2>
        <p className="section-desc">
          Configuration options passed to{" "}
          <code>&lt;ReactVirtualEngine /&gt;</code>.
        </p>
        <div className="table-wrapper">
          <table className="api-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>items</code> <span className="required">*</span>
                </td>
                <td>
                  <code>ArrayLike&lt;T&gt;</code>
                </td>
                <td>
                  The data array to render. Can be any array-like structure.
                </td>
              </tr>
              <tr>
                <td>
                  <code>itemHeight</code> <span className="required">*</span>
                </td>
                <td>
                  <code>number</code>
                </td>
                <td>
                  Fixed height of each row in pixels. Essential for O(1)
                  calculations.
                </td>
              </tr>
              <tr>
                <td>
                  <code>renderItem</code> <span className="required">*</span>
                </td>
                <td>
                  <code>Function</code>
                </td>
                <td>
                  Function that returns the JSX element for a given item and
                  index. Must support <code>ref</code> if using zero-allocation
                  updates.
                </td>
              </tr>
              <tr>
                <td>
                  <code>height</code>
                </td>
                <td>
                  <code>number</code>
                </td>
                <td>
                  Viewport height in pixels. Defaults to <code>600</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <code>bufferRow</code>
                </td>
                <td>
                  <code>number</code>
                </td>
                <td>
                  Number of extra rows to render outside the viewport to prevent
                  flickering. Defaults to <code>0</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <code>version</code>
                </td>
                <td>
                  <code>number</code>
                </td>
                <td>
                  Cache-busting integer. Increment this to force a re-render of
                  all visible items.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="sub-title">Type Definition</h3>
        <CodeBlock code={propsCode} />
      </div>

      <div className="content-section">
        <h2 className="section-title">Engine Handle (Ref)</h2>
        <p className="section-desc">
          Methods exposed when you attach a <code>ref</code> to the engine.
          Useful for imperative scrolling and manual updates.
        </p>
        <CodeBlock code={handleCode} />
      </div>

      <div className="content-section">
        <h2 className="section-title">Row Handle (Ref)</h2>
        <p className="section-desc">
          The interface your row component must expose via{" "}
          <code>useImperativeHandle</code> to support the extreme-performance
          zero-allocation rendering mode.
        </p>
        <CodeBlock code={rowHandleCode} />
      </div>
    </div>
  );
};
