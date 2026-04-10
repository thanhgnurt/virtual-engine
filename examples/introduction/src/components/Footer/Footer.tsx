import { Link } from "react-router-dom";
import "./Footer.scss";

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="brand-logo">
            <div className="logo-box">VE</div>
            <span>Virtual Engine</span>
          </div>
          <p className="brand-desc">
            The specialized virtualization core for extreme scale trading and
            data-heavy React applications.
          </p>
        </div>

        <div className="footer-links">
          <div className="link-group">
            <h4>Product</h4>
            <Link to="/">Home</Link>
            <Link to="/quick-start">Quick Start</Link>
            <Link to="/benchmarks">Benchmarks</Link>
          </div>
          <div className="link-group">
            <h4>Community</h4>
            <a
              href="https://github.com/thanhgnurt/virtual-engine"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/react-virtual-engine"
              target="_blank"
              rel="noreferrer"
            >
              NPM Package
            </a>
          </div>
          <div className="link-group">
            <h4>Legal</h4>
            <Link to="/coming-soon">Privacy</Link>
            <Link to="/coming-soon">Terms</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © 2026 Virtual Engine. Built for the next generation of trading UIs.
        </p>
        <div className="social-status">
          <div className="status-dot"></div>
          <span>System Stable</span>
        </div>
      </div>
    </footer>
  );
};
