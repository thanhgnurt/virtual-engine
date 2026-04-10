import React from "react";
import "./Features.scss";

export const Features: React.FC = () => {
  return (
    <div className="features-grid">
      <div className="feature-card">
        <h3 className="feature-title">60 FPS</h3>
        <p className="feature-description">
          Consistent frame rates even with high-frequency data updates.
        </p>
      </div>
      <div className="feature-card">
        <h3 className="feature-title">Zero Allocation</h3>
        <p className="feature-description">
          Minimized garbage collection for ultra-low latency rendering.
        </p>
      </div>
      <div className="feature-card">
        <h3 className="feature-title">Scalable</h3>
        <p className="feature-description">
          Virtualize millions of rows without increasing memory pressure.
        </p>
      </div>
    </div>
  );
};
