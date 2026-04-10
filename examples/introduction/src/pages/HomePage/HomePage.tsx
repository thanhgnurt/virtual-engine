import React, { useState } from "react";
import { Hero } from "../../components/Hero";
import { FrameworkSelector } from "../../components/FrameworkSelector";
import { TradingUniverseSimulator } from "../../components/TradingUniverseSimulator/TradingUniverseSimulator";
import { useSEO } from "../../hooks";
import "./HomePage.scss";

export const HomePage: React.FC = () => {
  useSEO({
    title: "High Performance Virtualization",
    description:
      "A specialized, zero-allocation React virtual engine designed for extreme scale and high-frequency updates with silky smooth 60 FPS performance.",
  });

  const [hoveredFramework, setHoveredFramework] = useState<string>("React");

  return (
    <div className="home-page">
      <div className="home-hero-bg">
        <Hero activeFramework={hoveredFramework} />
        <FrameworkSelector
          onHover={(name) => setHoveredFramework(name)}
          onLeave={() => setHoveredFramework("React")}
        />
      </div>

      <section className="home-demo-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Live Performance Proof</h2>
            <p className="section-subtitle">
              Don't just take our word for it. Interact with 100,000 live nodes
              updating at 60fps.
            </p>
          </div>
          <TradingUniverseSimulator />
        </div>
      </section>
    </div>
  );
};
