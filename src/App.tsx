import { useState } from "react";
import MainContent from "./components/MainContent";
import Navbar from "./components/Navbar";
import type { SalesDataSettings } from "./types";
import "./App.css";

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [salesDataSettings, setSalesDataSettings] = useState<SalesDataSettings>({
    categoryColumn: "Category",
    includedCategories: "",
    includedRegionColumns: "",
    showRegionFilter: true,
    showSheetFilter: true,
    showCategoryFilter: true,
    showSalesCount: true,
    showOverallCount: true,
  });

  return (
    <div className={`app-shell ${isDarkMode ? "theme-dark" : "theme-light"}`}>
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      <main className="app-screen">
        <MainContent
          activePage={activePage}
          isDarkMode={isDarkMode}
          onDarkModeChange={setIsDarkMode}
          salesDataSettings={salesDataSettings}
          onSalesDataSettingsChange={setSalesDataSettings}
        />
      </main>
    </div>
  );
}
