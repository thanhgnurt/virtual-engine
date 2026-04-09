import React from "react";
import { Link } from "react-router-dom";

export const Header: React.FC = () => {
  return (
    <header className="pt-24 pb-12 px-6 text-center max-w-4xl mx-auto">
      <nav className="flex justify-center gap-6 mb-8 text-sm font-medium">
        <Link
          to="/"
          className="text-slate-400 hover:text-white transition-colors"
        >
          Home
        </Link>
        <Link
          to="/comparison"
          className="text-slate-400 hover:text-white transition-colors"
        >
          Performance Comparison
        </Link>
      </nav>
      <div className="inline-block px-4 py-1-5 mb-6 text-sm font-semibold tracking-wide text-brand-400 uppercase bg-brand-400/10 rounded-full border border-brand-400/20">
        v1.0.1 Stable
      </div>
      <h1 className="text-6xl font-extrabold mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
        Virtual Engine
      </h1>
      <p className="text-xl text-slate-400 mb-10 leading-relaxed">
        High-performance, zero-allocation rendering engine for React. Built for
        60FPS real-time data streaming and massive data sets.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link
          to="/comparison"
          className="px-8 py-3 bg-brand-500 hover:bg-brand-600 rounded-lg font-bold shadow-lg shadow-brand-500/20"
        >
          Compare Now
        </Link>
        <button className="px-8 py-3 glass rounded-lg font-bold hover:bg-slate-800/50">
          GitHub
        </button>
      </div>
    </header>
  );
};
