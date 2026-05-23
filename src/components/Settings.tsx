import Card from "./Card";
import type { SalesDataSettings } from "../types";
import "./Settings.css";

type SettingsProps = {
    isDarkMode: boolean;
    onDarkModeChange: (enabled: boolean) => void;
    salesDataSettings: SalesDataSettings;
    onSalesDataSettingsChange: (settings: SalesDataSettings) => void;
};

export default function Settings({
    isDarkMode,
    onDarkModeChange,
    salesDataSettings,
    onSalesDataSettingsChange,
}: SettingsProps) {
    const updateSalesDataSetting = (key: keyof SalesDataSettings, value: string) => {
        onSalesDataSettingsChange({
            ...salesDataSettings,
            [key]: value,
        });
    };
    const updateSalesDataToggle = (key: keyof SalesDataSettings, value: boolean) => {
        onSalesDataSettingsChange({
            ...salesDataSettings,
            [key]: value,
        });
    };
    const updateSalesDataNumber = (key: keyof SalesDataSettings, value: string) => {
        const nextValue = Number(value);

        onSalesDataSettingsChange({
            ...salesDataSettings,
            [key]: Number.isFinite(nextValue) ? nextValue : 0,
        });
    };

    return (
        <section className="settings-page">
            <Card
                title="Appearance"
                description="Choose how the dashboard looks on this device."
                actions={
                    <label className="theme-switch">
                        <input
                            type="checkbox"
                            checked={isDarkMode}
                            onChange={(event) => onDarkModeChange(event.target.checked)}
                        />
                        <span aria-hidden="true" />
                    </label>
                }
            >
                <div className="setting-row">
                    <div>
                        <strong>Dark mode</strong>
                        <p>Use a darker interface for the sales map and controls.</p>
                    </div>
                    <span className="setting-value">{isDarkMode ? "On" : "Off"}</span>
                </div>
            </Card>

            <Card
                title="Sales Data"
                description="Choose which Excel rows and region columns are included in the map totals."
            >
                <div className="settings-form">
                    <label>
                        Category column
                        <input
                            value={salesDataSettings.categoryColumn}
                            onChange={(event) =>
                                updateSalesDataSetting("categoryColumn", event.target.value)
                            }
                            placeholder="Category"
                        />
                    </label>

                    <label>
                        Categories to include
                        <textarea
                            value={salesDataSettings.includedCategories}
                            onChange={(event) =>
                                updateSalesDataSetting("includedCategories", event.target.value)
                            }
                            placeholder="Sales, New Accounts, Renewals"
                        />
                    </label>

                    <label>
                        Region columns to count
                        <textarea
                            value={salesDataSettings.includedRegionColumns}
                            onChange={(event) =>
                                updateSalesDataSetting("includedRegionColumns", event.target.value)
                            }
                            placeholder="NCR, BARMM, Region 1, Region IV-A"
                        />
                    </label>

                    <label>
                        Overall share decimal places
                        <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            value={salesDataSettings.overallShareDecimalPlaces}
                            onChange={(event) =>
                                updateSalesDataNumber(
                                    "overallShareDecimalPlaces",
                                    event.target.value,
                                )
                            }
                        />
                    </label>

                    <div className="settings-check-grid">
                        <label>
                            <input
                                type="checkbox"
                                checked={salesDataSettings.showRegionFilter}
                                onChange={(event) =>
                                    updateSalesDataToggle("showRegionFilter", event.target.checked)
                                }
                            />
                            Show region filter
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={salesDataSettings.showSheetFilter}
                                onChange={(event) =>
                                    updateSalesDataToggle("showSheetFilter", event.target.checked)
                                }
                            />
                            Show sheet filter
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={salesDataSettings.showCategoryFilter}
                                onChange={(event) =>
                                    updateSalesDataToggle("showCategoryFilter", event.target.checked)
                                }
                            />
                            Show category filter
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={salesDataSettings.showSalesCount}
                                onChange={(event) =>
                                    updateSalesDataToggle("showSalesCount", event.target.checked)
                                }
                            />
                            Show sales count
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={salesDataSettings.showOverallCount}
                                onChange={(event) =>
                                    updateSalesDataToggle("showOverallCount", event.target.checked)
                                }
                            />
                            Show overall percentage
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={salesDataSettings.showSalesBreakdownCount}
                                onChange={(event) =>
                                    updateSalesDataToggle(
                                        "showSalesBreakdownCount",
                                        event.target.checked,
                                    )
                                }
                            />
                            Show sales breakdown count
                        </label>
                    </div>
                </div>
            </Card>
        </section>
    );
}
