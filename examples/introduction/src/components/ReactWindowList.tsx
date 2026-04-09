import React from "react";
import { List, type RowComponentProps } from "react-window";

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
    <div
      style={style}
      className="px-6 py-2 border-b border-slate-800/50 flex items-center justify-between hover:bg-slate-800/20 transition-colors"
    >
      <div className="flex items-center gap-4">
        <span className="text-slate-500 font-mono text-sm w-12 text-left">
          #{index}
        </span>
        <span className="text-slate-200 font-medium">{item.name}</span>
      </div>
      <div className="flex gap-8">
        <span className="text-brand-400 font-mono">
          ${item.price.toFixed(2)}
        </span>
        <span
          className={`font-mono text-sm ${
            item.change >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
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
