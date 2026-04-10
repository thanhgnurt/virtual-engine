import React, { memo } from "react";
import { List, type RowComponentProps } from "react-window";
import "./ReactWindowList.scss";

export interface ReactWindowListProps {
  items: { id: number; name: string; price: number; change: number; val: number }[];
  itemHeight: number;
  height: number;
}

type RowProps = RowComponentProps<{
  items: { id: number; name: string; price: number; change: number; val: number }[];
}>;

const RowComponent = memo(
  ({ index, items, style }: RowProps) => {
    const item = items[index];
    if (!item) return null;

    return (
      <div style={style} className="rw-row">
        <div className="row-left">
          <span className="row-index">#{index}</span>
          <span className="row-name">{item.name}</span>
        </div>
        <div className="row-right">
          <span className="row-val">
            {item.val.toLocaleString()}
          </span>
          <span className="row-price">${item.price.toFixed(2)}</span>
          <span
            className={`row-change ${item.change >= 0 ? "positive" : "negative"}`}
          >
            {item.change >= 0 ? "+" : ""}
            {item.change.toFixed(2)}%
          </span>
        </div>
      </div>
    );
  },
  (prev: RowProps, next: RowProps) => {
    // Only re-render if the active item's data or style changes
    return (
      prev.index === next.index &&
      prev.style === next.style &&
      prev.items[prev.index] === next.items[next.index]
    );
  },
) as unknown as (props: RowProps) => React.ReactElement;

export const ReactWindowList: React.FC<ReactWindowListProps> = ({
  items,
  itemHeight,
  height,
}) => {
  return (
    <List
      rowComponent={RowComponent}
      rowCount={items.length}
      rowHeight={itemHeight}
      rowProps={{ items }}
      style={{ height: height, width: "100%" }}
      className="ve-scrollbar"
    />
  );
};
