import React, { useState } from "react";
import { ReactVirtualEngine } from "react-virtual-engine";
import { VirtualRow, VirtualRowData } from "../VirtualRow";
import { ROW_HEIGH } from "../../constants";
import "./TradingUniverseSimulator.scss";

const ITEM_COUNT = 100000;

export const TradingUniverseSimulator: React.FC = () => {
  const [items] = useState(() =>
    Array.from({ length: ITEM_COUNT }, (_, i) => ({
      id: i,
      name: `Index Item ${i}`,
      price: Math.random() * 1000 + 100,
      change: (Math.random() - 0.5) * 5,
    })),
  );

  return (
    <div className="simulator-card">
      <div className="card-header">
        <div className="window-controls">
          <div className="control-dot red" />
          <div className="control-dot amber" />
          <div className="control-dot green" />
          <span className="header-title">Trading Universe Simulator</span>
        </div>
        <div className="header-stats">
          {ITEM_COUNT.toLocaleString()} Items Loaded
        </div>
      </div>

      <div className="simulator-container">
        <ReactVirtualEngine
          items={items}
          itemHeight={ROW_HEIGH}
          height={500}
          className="ve-scrollbar"
          rowClass="virtual-row-item"
          renderItem={(item: unknown, index: number) => (
            <VirtualRow
              key={index}
              index={index}
              data={item as VirtualRowData}
            />
          )}
        />
      </div>
    </div>
  );
};
