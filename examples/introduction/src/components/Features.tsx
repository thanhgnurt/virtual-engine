import React from "react";

export const Features: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      <div className="glass p-8 rounded-2xl border-white/5">
        <h3 className="text-lg font-bold mb-3 text-white">60 FPS</h3>
        <p className="text-slate-400 text-sm">
          Consistent frame rates even with high-frequency data updates.
        </p>
      </div>
      <div className="glass p-8 rounded-2xl border-white/5">
        <h3 className="text-lg font-bold mb-3 text-white">Zero Allocation</h3>
        <p className="text-slate-400 text-sm">
          Minimized garbage collection for ultra-low latency rendering.
        </p>
      </div>
      <div className="glass p-8 rounded-2xl border-white/5">
        <h3 className="text-lg font-bold mb-3 text-white">Scalable</h3>
        <p className="text-slate-400 text-sm">
          Virtualize millions of rows without increasing memory pressure.
        </p>
      </div>
    </div>
  );
};
