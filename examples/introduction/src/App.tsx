import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "./components/MainLayout";

// Lazy load pages
const HomePage = lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const ApiPage = lazy(() => import("./pages/ApiPage/ApiPage").then(m => ({ default: m.ApiPage })));
const QuickStartPage = lazy(() => import("./pages/QuickStartPage/QuickStartPage").then(m => ({ default: m.QuickStartPage })));
const ComparisonPage = lazy(() => import("./pages/ComparisonPage").then(m => ({ default: m.ComparisonPage })));
const ComingSoonPage = lazy(() => import("./pages/ComingSoonPage").then(m => ({ default: m.ComingSoonPage })));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'rgba(255,255,255,0.3)' }}>
    <div className="animate-pulse">Loading...</div>
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/api" element={<ApiPage />} />
            <Route path="/quick-start" element={<QuickStartPage />} />
            <Route path="/benchmarks" element={<ComparisonPage />} />
            <Route path="/coming-soon" element={<ComingSoonPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </BrowserRouter>
  );
};

export default App;
