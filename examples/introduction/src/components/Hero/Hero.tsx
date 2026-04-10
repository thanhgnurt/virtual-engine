import { Link } from "react-router-dom";
import "./Hero.scss";

export interface HeroProps {
  activeFramework?: string;
}

export const Hero: React.FC<HeroProps> = ({ activeFramework = "React" }) => {
  const scrollToDemo = () => {
    const wrapper = document.querySelector(".main-wrapper");
    const demo = document.querySelector(".home-demo-section");
    if (wrapper && demo) {
      const wrapperRect = wrapper.getBoundingClientRect();
      const demoRect = demo.getBoundingClientRect();
      const top = wrapper.scrollTop + demoRect.top - wrapperRect.top + 100;

      wrapper.scrollTo({
        top,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="hero-section">
      <h1 className="hero-title">
        Next-Gen <span className="highlight">Virtualization</span> Core
        <br />
        <span className="fw-dependent-text">for {activeFramework}</span>
      </h1>
      <p className="hero-subtitle">
        A specialized, zero-allocation engine designed for extreme scale and
        high-frequency updates. Silky smooth 60 FPS performance, regardless of
        data size.
      </p>

      <div className="hero-actions">
        <Link to="/quick-start" className="hero-btn primary">
          Get Started
        </Link>
        <button onClick={scrollToDemo} className="hero-btn secondary">
          Live Demo
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
