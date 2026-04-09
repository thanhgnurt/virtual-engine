import React, { useState } from "react";
import VirtualList from "react-virtual-engine";
import { Features } from "../components/Features";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { VirtualRow, VirtualRowData } from "../components/VirtualRow";
import { ROW_HEIGH } from "../constants";

const ITEM_COUNT = 100000;

export const HomePage: React.FC = () => {
  const [items] = useState(() =>
    Array.from({ length: ITEM_COUNT }, (_, i) => ({
      id: i,
      name: `Index Item ${i}`,
      price: Math.random() * 1000 + 100,
      change: (Math.random() - 0.5) * 5,
    })),
  );

  return (
    <div className="min-h-screen">
      <Header />

      {/* Demo Section */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <div className="glass rounded-2xl overflow-hidden shadow-2xl border border-white/5">
          <div className="px-8 py-4 bg-slate-900/50 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="ml-4 text-base font-semibold text-slate-300">
                Trading Universe Simulator
              </span>
            </div>
            <div className="text-base font-mono text-brand-400">
              {ITEM_COUNT.toLocaleString()} Items Loaded
            </div>
          </div>

          <div className="h-[500px] w-full bg-slate-950/50">
            <VirtualList
              items={items}
              itemHeight={ROW_HEIGH}
              height={500}
              className="ve-scrollbar"
              rowClass="pl-6 pr-10 py-2 border-b border-white/5 flex items-center justify-between hover:bg-slate-800/20 cursor-pointer"
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

        <Features />
      </section>

      <Footer />
    </div>
  );
};
