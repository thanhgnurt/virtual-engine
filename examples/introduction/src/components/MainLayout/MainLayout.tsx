import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "../Sidebar";
import { Header } from "../Header";
import { ScrollToTop } from "../ScrollToTop/ScrollToTop";
import "./MainLayout.scss";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <div className="app-container">
      <Header />
      <div className="app-body">
        {!isHomePage && <Sidebar />}
        <div
          ref={wrapperRef}
          className={`main-wrapper ${isHomePage ? "full-width" : ""}`}
        >
          <main className="main-content">{children}</main>
        </div>
      </div>
      <ScrollToTop />
    </div>
  );
};
