import React, { useState, useEffect } from "react";
import "./ScrollToTop.scss";

export const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const wrapper = document.querySelector(".main-wrapper");
    if (!wrapper) return;

    const toggleVisibility = () => {
      if (wrapper.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    wrapper.addEventListener("scroll", toggleVisibility);
    return () => wrapper.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    const wrapper = document.querySelector(".main-wrapper");
    if (wrapper) {
      wrapper.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <button
      className={`scroll-to-top ${isVisible ? "visible" : ""}`}
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
};
