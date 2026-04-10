import React from "react";
import { List, type RowComponentProps } from "react-window";
import "./ReactWindowList.scss";

export interface ReactWindowListProps {
  items: { id: number; name: string; price: number; change: number }[];
  itemHeight: number;
  height: number;
}

function RowComponent({
  index,
  items,
  style,
}: RowComponentProps<{
  items: { id: number; name: string; price: number; change: number }[];
}>) {
  const item = items[index];
  if (!item) return null;

  return (
    <div style={style} className="rw-row">
      <div className="row-left">
        <span className="row-index">#{index}</span>
        <span className="row-name">{item.name}</span>
      </div>
      <div className="row-right">
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
}

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
