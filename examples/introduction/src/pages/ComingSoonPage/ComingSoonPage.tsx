import React from "react";
import { Link } from "react-router-dom";
import "./ComingSoonPage.scss";

export const ComingSoonPage: React.FC = () => {
  return (
    <div className="coming-soon-page">
      <div className="content">
        <h1 className="title">Coming Soon</h1>
        <p className="description">
          Our high-performance engine is currently being optimized for this
          framework.
        </p>
        <Link to="/" className="back-link">
          ← Back to React Version
        </Link>
      </div>
    </div>
  );
};
