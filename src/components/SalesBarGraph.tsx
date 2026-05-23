import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import "./SalesBarGraph.css";

export type SalesBreakdownDatum = {
    id: string;
    label: string;
    sales: number;
    percentage: number;
};

export type SalesBreakdownMode = "sheets" | "categories" | "regions";

export type SalesBreakdownModes = Record<SalesBreakdownMode, boolean>;

type SalesBarGraphProps = {
    data: SalesBreakdownDatum[];
    description: string;
    overallPercentage: number;
    showCount: boolean;
    activeModes: SalesBreakdownMode[];
    availableModes: SalesBreakdownModes;
    onModeToggle: (mode: SalesBreakdownMode, enabled: boolean) => void;
    formatSales: (value: number) => string;
    formatOverallShare: (value: number) => string;
};

export default function SalesBarGraph({
    data,
    description,
    overallPercentage,
    showCount,
    activeModes,
    availableModes,
    onModeToggle,
    formatSales,
    formatOverallShare,
}: SalesBarGraphProps) {
    const chartHeight = Math.max(360, data.length * 34 + 90);

    return (
        <section className="map-chart-panel" aria-label="Sales percentage breakdown">
            <div className="map-chart-heading">
                <div>
                    <strong>Sales Breakdown</strong>
                    <span>{description}</span>
                </div>
                <strong>{formatOverallShare(overallPercentage)}%</strong>
            </div>

            <div className="map-chart-controls" aria-label="Sales breakdown grouping">
                <label>
                    <input
                        type="checkbox"
                        checked={activeModes.includes("sheets")}
                        disabled={!availableModes.sheets}
                        onChange={(event) => onModeToggle("sheets", event.target.checked)}
                    />
                    By sheets
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={activeModes.includes("categories")}
                        disabled={!availableModes.categories}
                        onChange={(event) => onModeToggle("categories", event.target.checked)}
                    />
                    By categories
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={activeModes.includes("regions")}
                        disabled={!availableModes.regions}
                        onChange={(event) => onModeToggle("regions", event.target.checked)}
                    />
                    By regions
                </label>
            </div>

            <div className="map-chart-body" style={{ height: `${chartHeight}px` }}>
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 12, right: 36, bottom: 12, left: 18 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis
                                type="number"
                                domain={[0, "dataMax"]}
                                tickFormatter={(value) => `${formatOverallShare(Number(value))}%`}
                            />
                            <YAxis
                                type="category"
                                dataKey="label"
                                width={190}
                                tick={{ fontSize: 12, fontWeight: 700 }}
                            />
                            <Tooltip
                                formatter={(value, name, item) => {
                                    const payload = item.payload as SalesBreakdownDatum;

                                    if (name === "percentage") {
                                        return [
                                            showCount
                                                ? `${formatOverallShare(Number(value))}% (${formatSales(
                                                      payload.sales,
                                                  )})`
                                                : `${formatOverallShare(Number(value))}%`,
                                            "Share",
                                        ];
                                    }

                                    return [formatSales(Number(value)), "Sales"];
                                }}
                                cursor={{ fill: "rgba(250, 204, 21, 0.16)" }}
                            />
                            <Bar dataKey="percentage" minPointSize={4} radius={[0, 8, 8, 0]}>
                                {data.map((entry, index) => (
                                    <Cell
                                        key={entry.id}
                                        fill={index === 0 ? "#facc15" : "#2563eb"}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="map-chart-empty">
                        <strong>No percentage breakdown</strong>
                        <span>Upload sales data or adjust the current filters.</span>
                    </div>
                )}
            </div>
        </section>
    );
}
