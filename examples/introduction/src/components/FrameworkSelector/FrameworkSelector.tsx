import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./FrameworkSelector.scss";

const frameworks = [
  {
    id: "react",
    name: "React",
    path: "/quick-start",
    icon: (
      <svg viewBox="-11.5 -10.23174 23 20.46348" width="24" height="24">
        <circle cx="0" cy="0" r="2.05" fill="currentColor" />
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <ellipse rx="11" ry="4.2" />
          <ellipse rx="11" ry="4.2" transform="rotate(60)" />
          <ellipse rx="11" ry="4.2" transform="rotate(120)" />
        </g>
      </svg>
    ),
  },
  {
    id: "angular",
    name: "Angular",
    path: "/coming-soon",
    icon: (
      <svg viewBox="0 0 250 250" width="24" height="24">
        <polygon
          fill="#DD0031"
          points="125,30 125,30 125,30 31.9,63.2 46.1,186.3 125,230 125,230 125,230 203.9,186.3 218.1,63.2"
        />
        <polygon
          fill="#C3002F"
          points="125,30 125,52.2 125,230 125,230 203.9,186.3 218.1,63.2"
        />
        <path
          fill="#FFFFFF"
          d="M125,52.1L66.8,182.6h21.7l11.7-29.2h49.4l11.7,29.2h21.7L125,52.1z M142,135.4H108l17-40.9L142,135.4z"
        />
      </svg>
    ),
  },
  {
    id: "vue",
    name: "Vue",
    path: "/coming-soon",
    icon: (
      <svg viewBox="0 0 256 221" width="24" height="24">
        <path
          fill="#41B883"
          d="M204.8 0H256L128 220.8 0 0h97.92L128 51.2 157.44 0h47.36z"
        />
        <path
          fill="#35495E"
          d="M0 0l128 220.8L256 0h-51.2L128 132.48 50.56 0H0z"
        />
      </svg>
    ),
  },
  {
    id: "javascript",
    name: "JavaScript",
    path: "/coming-soon",
    icon: (
      <svg viewBox="0 0 448 512" width="24" height="24">
        <path
          fill="#F7DF1E"
          d="M0 32v448h448V32H0zm243.8 349.4c0 43.6-25.6 63.5-62.9 63.5-33.7 0-53.2-17.4-63.2-38.5l34.3-20.7c6.6 11.7 12.6 21.6 27.1 21.6 13.8 0 22.6-5.4 22.6-26.5V232.6h42.1v148.8zm99.8 63.5c-38.7 0-61.7-23-72.9-42.1l32.2-19.7c7 10.3 16.5 21.8 37.3 21.8 14.1 0 23.4-6.3 23.4-16 0-11-8.5-14.9-28-23.3-30.8-13.1-51.5-22.1-51.5-56 0-30 24.3-51.4 56-51.4 27.1 0 45.4 11.9 57.3 32.8l-30.4 19.3c-6.6-11.7-16-17.6-28-17.6-12 0-19.1 5.7-19.1 14.1 0 10.1 6.5 13.5 26.3 21.9 33.7 14.1 53.6 26 53.6 57 0 31.5-24.1 55.4-58.1 55.4z"
        />
      </svg>
    ),
  },
];

export interface FrameworkSelectorProps {
  onHover?: (frameworkName: string) => void;
  onLeave?: () => void;
}

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  onHover,
  onLeave,
}) => {
  const location = useLocation();

  return (
    <div className="framework-selector">
      <div className="selector-bar" onMouseLeave={onLeave}>
        {frameworks.map((fw) => {
          const isActive = location.pathname === fw.path && fw.id === "react";
          return (
            <Link
              key={fw.id}
              to={fw.path}
              className={`framework-btn ${isActive ? "active" : ""} ${fw.id}`}
              onMouseEnter={() => onHover?.(fw.name)}
            >
              <span className="fw-icon">{fw.icon}</span>
              <span className="fw-name">{fw.name}</span>
              <span className="fw-arrow">›</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
