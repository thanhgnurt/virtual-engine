import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ComparisonPage } from "./pages/ComparisonPage";
import { HomePage } from "./pages/HomePage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { ApiPage } from "./pages/ApiPage/ApiPage";
import { QuickStartPage } from "./pages/QuickStartPage/QuickStartPage";
import { MainLayout } from "./components/MainLayout";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/api" element={<ApiPage />} />
          <Route path="/quick-start" element={<QuickStartPage />} />
          <Route path="/benchmarks" element={<ComparisonPage />} />
          <Route path="/coming-soon" element={<ComingSoonPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};

export default App;
