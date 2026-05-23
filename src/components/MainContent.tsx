import SalesMap from "./SalesMap";
import Settings from "./Settings";
import type { SalesDataSettings } from "../types";

type MainContentProps = {
    activePage: string;
    isDarkMode: boolean;
    onDarkModeChange: (enabled: boolean) => void;
    salesDataSettings: SalesDataSettings;
    onSalesDataSettingsChange: (settings: SalesDataSettings) => void;
};

export default function MainContent({
    activePage,
    isDarkMode,
    onDarkModeChange,
    salesDataSettings,
    onSalesDataSettingsChange,
}: MainContentProps) {
    if (activePage === "Map") {
        return <SalesMap salesDataSettings={salesDataSettings} />;
    }

    if (activePage === "Settings") {
        return (
            <Settings
                isDarkMode={isDarkMode}
                onDarkModeChange={onDarkModeChange}
                salesDataSettings={salesDataSettings}
                onSalesDataSettingsChange={onSalesDataSettingsChange}
            />
        );
    }

    return <SalesMap salesDataSettings={salesDataSettings} />;
}
