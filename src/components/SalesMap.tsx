import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { kml } from "@tmcw/togeojson";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import philippinesRegions from "../data/philippines-regions.json";
import type { SalesDataSettings } from "../types";
import "leaflet/dist/leaflet.css";
import "./SalesMap.css";

type LatLng = [number, number];
type SelectionLevel = "country" | "region" | "city";

type RegionProperties = {
    adm1_psgc: number;
    adm1_en: string;
    geo_level: string;
    area_km2: number;
};

type City = {
    id: string;
    regionId: string;
    name: string;
    center: LatLng;
};

const regionGeoJson = philippinesRegions as FeatureCollection<Geometry, RegionProperties>;
const country = {
    id: "philippines",
    name: "Philippines",
};

const cities: City[] = [
    { id: "laoag", regionId: "100000000", name: "Laoag City", center: [18.196, 120.5927] },
    { id: "tuguegarao", regionId: "200000000", name: "Tuguegarao City", center: [17.6132, 121.727] },
    { id: "san-fernando-pampanga", regionId: "300000000", name: "San Fernando", center: [15.0333, 120.6833] },
    { id: "calamba", regionId: "400000000", name: "Calamba City", center: [14.2117, 121.1653] },
    { id: "legazpi", regionId: "500000000", name: "Legazpi City", center: [13.1391, 123.7438] },
    { id: "iloilo", regionId: "600000000", name: "Iloilo City", center: [10.7202, 122.5621] },
    { id: "cebu", regionId: "700000000", name: "Cebu City", center: [10.3157, 123.8854] },
    { id: "tacloban", regionId: "800000000", name: "Tacloban City", center: [11.2543, 125.0058] },
    { id: "zamboanga", regionId: "900000000", name: "Zamboanga City", center: [6.9214, 122.079] },
    { id: "cagayan-de-oro", regionId: "1000000000", name: "Cagayan de Oro", center: [8.4542, 124.6319] },
    { id: "davao", regionId: "1100000000", name: "Davao City", center: [7.1907, 125.4553] },
    { id: "koronadal", regionId: "1200000000", name: "Koronadal City", center: [6.5031, 124.8469] },
    { id: "manila", regionId: "1300000000", name: "Manila", center: [14.5995, 120.9842] },
    { id: "baguio", regionId: "1400000000", name: "Baguio City", center: [16.4023, 120.596] },
    { id: "butuan", regionId: "1600000000", name: "Butuan City", center: [8.9475, 125.5406] },
    { id: "calapan", regionId: "1700000000", name: "Calapan City", center: [13.4117, 121.18] },
    { id: "cotabato", regionId: "1900000000", name: "Cotabato City", center: [7.2236, 124.2464] },
];

const getRegionId = (feature: Feature<Geometry, RegionProperties>) =>
    String(feature.properties.adm1_psgc);

const getRegionName = (feature: Feature<Geometry, RegionProperties>) =>
    feature.properties.adm1_en === "MIMAROPA Region"
        ? "Region IV-B (MIMAROPA)"
        : feature.properties.adm1_en;

const regionGroupIds: Record<string, string[]> = {
    visayas: ["600000000", "700000000", "800000000"],
    mindanao: ["900000000", "1000000000", "1100000000", "1200000000", "1600000000", "1900000000"],
};

const clampDecimalPlaces = (value: number) =>
    Math.min(10, Math.max(0, Number.isFinite(value) ? Math.trunc(value) : 0));

type SalesMapProps = {
    salesDataSettings: SalesDataSettings;
};

type ExcelWorkbookData = {
    sheetNames: string[];
    sheets: Record<string, Record<string, unknown>[]>;
};

export default function SalesMap({ salesDataSettings }: SalesMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const layerGroupRef = useRef<L.LayerGroup | null>(null);
    const uploadLayerRef = useRef<L.GeoJSON | null>(null);
    const themeColors = useMemo(() => {
        const styles = getComputedStyle(document.documentElement);

        return {
            highlight: styles.getPropertyValue("--selection-yellow").trim() || "#facc15",
            stroke: styles.getPropertyValue("--map-stroke").trim() || "#2563eb",
            marker: styles.getPropertyValue("--map-marker").trim() || "#475569",
            textStrong: styles.getPropertyValue("--text-strong").trim() || "#111827",
        };
    }, []);
    const regionFeatures = useMemo(
        () =>
            [...regionGeoJson.features].sort((first, second) =>
                getRegionName(first).localeCompare(getRegionName(second)),
            ),
        [],
    );
    const [selectedLevel, setSelectedLevel] = useState<SelectionLevel>("country");
    const [selectedRegionId, setSelectedRegionId] = useState(getRegionId(regionFeatures[0]));
    const [selectedCityId, setSelectedCityId] = useState(cities[0].id);
    const [uploadStatus, setUploadStatus] = useState("No KMZ uploaded");
    const [excelStatus, setExcelStatus] = useState("No Excel uploaded");
    const [salesByRegion, setSalesByRegion] = useState<Record<string, number>>({});
    const [countrySalesTotal, setCountrySalesTotal] = useState(0);
    const [overallSalesTotal, setOverallSalesTotal] = useState(0);
    const [excelWorkbook, setExcelWorkbook] = useState<ExcelWorkbookData | null>(null);
    const [selectedSheetName, setSelectedSheetName] = useState("");
    const [excelRows, setExcelRows] = useState<Record<string, unknown>[]>([]);
    const [excelFileName, setExcelFileName] = useState("");
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

    const selectedRegion = useMemo(
        () =>
            regionFeatures.find((region) => getRegionId(region) === selectedRegionId) ??
            regionFeatures[0],
        [regionFeatures, selectedRegionId],
    );
    const filteredCities = useMemo(
        () => cities.filter((city) => city.regionId === selectedRegionId),
        [selectedRegionId],
    );
    const selectedCity = useMemo(
        () => cities.find((city) => city.id === selectedCityId) ?? filteredCities[0] ?? cities[0],
        [filteredCities, selectedCityId],
    );
    const selectedRegionSales = salesByRegion[selectedRegionId] ?? 0;
    const displayedSales = selectedLevel === "country" ? countrySalesTotal : selectedRegionSales;
    const displayedSalesLabel =
        selectedLevel === "country" ? "Philippines Sales" : `${getRegionName(selectedRegion)} Sales`;
    const displayedOverallPercentage =
        overallSalesTotal > 0 ? (displayedSales / overallSalesTotal) * 100 : 0;
    const overallShareDecimalPlaces = clampDecimalPlaces(
        salesDataSettings.overallShareDecimalPlaces,
    );
    const categoryColumnName = salesDataSettings.categoryColumn.trim();
    const uploadedCategories = useMemo(() => {
        if (!categoryColumnName || excelRows.length === 0) {
            return [];
        }

        return Array.from(
            new Set(
                excelRows
                    .map((row) => String(row[categoryColumnName] ?? "").trim())
                    .filter(Boolean),
            ),
        ).sort((first, second) => first.localeCompare(second));
    }, [categoryColumnName, excelRows]);

    const getSheetRows = (workbook: ExcelWorkbookData, sheetName: string) => {
        const rows = workbook.sheets[sheetName];

        if (!rows) {
            throw new Error("Selected worksheet could not be found.");
        }

        return rows;
    };

    const getExcelCellValue = (value: ExcelJS.CellValue | undefined): unknown => {
        if (value == null) {
            return "";
        }

        if (value instanceof Date || typeof value !== "object") {
            return value;
        }

        if ("result" in value) {
            return getExcelCellValue(value.result as ExcelJS.CellValue);
        }

        if ("text" in value && typeof value.text === "string") {
            return value.text;
        }

        if ("richText" in value && Array.isArray(value.richText)) {
            return value.richText.map((item) => item.text).join("");
        }

        if ("error" in value && typeof value.error === "string") {
            return value.error;
        }

        return String(value);
    };

    const getHeaderName = (value: unknown, index: number, usedHeaders: Set<string>) => {
        const rawHeader = String(value ?? "").trim();
        const baseHeader = rawHeader || (index === 0 ? "__EMPTY" : `__EMPTY_${index}`);
        let header = baseHeader;
        let suffix = 1;

        while (usedHeaders.has(header)) {
            header = `${baseHeader}_${suffix}`;
            suffix += 1;
        }

        usedHeaders.add(header);
        return header;
    };

    const worksheetToRows = (worksheet: ExcelJS.Worksheet) => {
        if (worksheet.actualRowCount === 0) {
            return [];
        }

        const headerRow = worksheet.getRow(1);
        const columnCount = Math.max(worksheet.columnCount, headerRow.cellCount);
        const usedHeaders = new Set<string>();
        const headers = Array.from({ length: columnCount }, (_item, index) =>
            getHeaderName(getExcelCellValue(headerRow.getCell(index + 1).value), index, usedHeaders),
        );
        const rows: Record<string, unknown>[] = [];

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
            const row = worksheet.getRow(rowNumber);
            const values = headers.map((_header, index) =>
                getExcelCellValue(row.getCell(index + 1).value),
            );

            if (values.every((value) => value === "")) {
                continue;
            }

            rows.push(
                Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
            );
        }

        return rows;
    };

    const exceljsWorkbookToData = (workbook: ExcelJS.Workbook): ExcelWorkbookData => {
        const sheets: ExcelWorkbookData["sheets"] = {};
        const sheetNames = workbook.worksheets.map((worksheet) => {
            sheets[worksheet.name] = worksheetToRows(worksheet);
            return worksheet.name;
        });

        return { sheetNames, sheets };
    };

    const parseCsvLine = (line: string) => {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];
            const nextChar = line[index + 1];

            if (char === '"' && inQuotes && nextChar === '"') {
                current += '"';
                index += 1;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
                values.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }

        values.push(current.trim());
        return values;
    };

    const readExcelWorkbook = async (file: File) => {
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith(".xls")) {
            throw new Error("Legacy .xls files are not supported. Please upload .xlsx or .csv.");
        }

        const workbook = new ExcelJS.Workbook();

        if (fileName.endsWith(".csv")) {
            const worksheet = workbook.addWorksheet("CSV");
            (await file.text())
                .split(/\r\n|\n|\r/)
                .filter((line) => line.length > 0)
                .forEach((line) => worksheet.addRow(parseCsvLine(line)));

            return exceljsWorkbookToData(workbook);
        }

        if (!fileName.endsWith(".xlsx")) {
            throw new Error("Please upload a .xlsx or .csv file.");
        }

        await workbook.xlsx.load(await file.arrayBuffer());
        return exceljsWorkbookToData(workbook);
    };

    const loadSheetRows = (workbook: ExcelWorkbookData, sheetName: string) => {
        const rows = getSheetRows(workbook, sheetName);

        if (rows.length === 0) {
            throw new Error("The selected worksheet has no rows to read.");
        }

        setExcelRows(rows);
        setSelectedCategoryFilter("all");
    };

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) {
            return;
        }

        const map = L.map(mapContainerRef.current, {
            center: [12.8797, 121.774],
            zoom: 6,
            minZoom: 5,
            maxZoom: 12,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; OpenStreetMap contributors | Boundaries: <a href="https://github.com/faeldon/philippines-json-maps">faeldon/philippines-json-maps</a>',
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        mapRef.current = map;
        layerGroupRef.current = layerGroup;

        return () => {
            map.remove();
            mapRef.current = null;
            layerGroupRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        const layerGroup = layerGroupRef.current;

        if (!map || !layerGroup) {
            return;
        }

        layerGroup.clearLayers();

        const regionLayer = L.geoJSON(regionGeoJson, {
            style: (feature) => {
                const featureId = feature ? getRegionId(feature as Feature<Geometry, RegionProperties>) : "";
                const isSelected =
                    selectedLevel === "region" && featureId === getRegionId(selectedRegion);

                return {
                    color: isSelected ? themeColors.textStrong : themeColors.stroke,
                    fillColor: isSelected ? themeColors.highlight : themeColors.stroke,
                    fillOpacity: isSelected ? 0.58 : selectedLevel === "country" ? 0.2 : 0.08,
                    opacity: 1,
                    weight: isSelected ? 3 : 1.5,
                };
            },
            onEachFeature: (feature, layer) => {
                const regionFeature = feature as Feature<Geometry, RegionProperties>;
                const regionId = getRegionId(regionFeature);

                layer.bindTooltip(getRegionName(regionFeature));
                layer.on("click", () => {
                    const nextCity = cities.find((city) => city.regionId === regionId);

                    setSelectedRegionId(regionId);
                    setSelectedCityId(nextCity?.id ?? selectedCityId);
                    setSelectedLevel("region");
                });
            },
        }).addTo(layerGroup);

        cities.forEach((city) => {
            const isSelected = selectedLevel === "city" && city.id === selectedCity.id;

            L.circleMarker(city.center, {
                radius: isSelected ? 12 : 7,
                color: isSelected ? themeColors.textStrong : themeColors.marker,
                fillColor: isSelected ? themeColors.highlight : "#ffffff",
                fillOpacity: 1,
                weight: isSelected ? 3 : 2,
            })
                .bindTooltip(city.name)
                .on("click", () => {
                    setSelectedCityId(city.id);
                    setSelectedRegionId(city.regionId);
                    setSelectedLevel("city");
                })
                .addTo(layerGroup);
        });

        if (selectedLevel === "country") {
            map.fitBounds(regionLayer.getBounds(), { padding: [28, 28] });
        } else if (selectedLevel === "region") {
            const selectedLayer = L.geoJSON(selectedRegion);
            map.fitBounds(selectedLayer.getBounds(), { padding: [48, 48] });
        } else {
            map.setView(selectedCity.center, 10);
        }
    }, [selectedCity, selectedCityId, selectedLevel, selectedRegion, themeColors]);

    const handleRegionChange = (regionId: string) => {
        if (regionId === "all") {
            setSelectedLevel("country");
            return;
        }

        const nextCity = cities.find((city) => city.regionId === regionId);

        setSelectedRegionId(regionId);
        setSelectedCityId(nextCity?.id ?? selectedCityId);
        setSelectedLevel("region");
    };

    const getKmlTextFromFile = async (file: File) => {
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith(".kml")) {
            return file.text();
        }

        if (!fileName.endsWith(".kmz")) {
            throw new Error("Please upload a .kmz or .kml file.");
        }

        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const kmlFile = Object.values(zip.files).find(
            (entry) => !entry.dir && entry.name.toLowerCase().endsWith(".kml"),
        );

        if (!kmlFile) {
            throw new Error("No .kml file was found inside this KMZ.");
        }

        return kmlFile.async("text");
    };

    const handleKmzUpload = async (file: File | undefined) => {
        const map = mapRef.current;

        if (!file || !map) {
            return;
        }

        try {
            setUploadStatus(`Loading ${file.name}...`);

            const kmlText = await getKmlTextFromFile(file);
            const kmlDocument = new DOMParser().parseFromString(kmlText, "text/xml");
            const parseError = kmlDocument.querySelector("parsererror");

            if (parseError) {
                throw new Error("The KML inside this file could not be parsed.");
            }

            const uploadGeoJson = kml(kmlDocument) as FeatureCollection<Geometry>;

            if (uploadLayerRef.current) {
                uploadLayerRef.current.removeFrom(map);
            }

            const uploadLayer = L.geoJSON(uploadGeoJson, {
                style: {
                    color: themeColors.textStrong,
                    fillColor: themeColors.highlight,
                    fillOpacity: 0.32,
                    opacity: 1,
                    weight: 3,
                },
                pointToLayer: (_feature, latlng) =>
                    L.circleMarker(latlng, {
                        radius: 8,
                        color: themeColors.textStrong,
                        fillColor: themeColors.highlight,
                        fillOpacity: 1,
                        weight: 2,
                    }),
                onEachFeature: (feature, layer) => {
                    const name = feature.properties?.name;

                    if (typeof name === "string" && name.length > 0) {
                        layer.bindTooltip(name);
                    }
                },
            }).addTo(map);

            uploadLayerRef.current = uploadLayer;

            const bounds = uploadLayer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [48, 48] });
            }

            setUploadStatus(`Uploaded ${file.name}`);
        } catch (error) {
            setUploadStatus(error instanceof Error ? error.message : "Upload failed.");
        }
    };

    const normalizeRegionName = (value: string) =>
        value
            .toLowerCase()
            .replace(/&/g, "and")
            .replace(/\bregion\b/g, "")
            .replace(/\bnational capital\b/g, "ncr")
            .replace(/\bcalabarzon\b/g, "iv a")
            .replace(/\bmimaropa\b/g, "iv b")
            .replace(/\bsoccsksargen\b/g, "xii")
            .replace(/\bbangsamoro autonomous in muslim mindanao\b/g, "barmm")
            .replace(/\bbangsamoro autonomous region in muslim mindanao\b/g, "barmm")
            .replace(/\bcordillera administrative\b/g, "car")
            .replace(/[()_.-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const splitSettingList = (value: string) =>
        value
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean);

    const normalizeCategory = (value: unknown) =>
        String(value ?? "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

    const getRegionAliases = (feature: Feature<Geometry, RegionProperties>) => {
        const name = getRegionName(feature);
        const aliases = [name];
        const parenthetical = name.match(/\(([^)]+)\)/)?.[1];
        const numericRegion = Number(feature.properties.adm1_psgc) / 100000000;

        if (parenthetical) {
            aliases.push(parenthetical);
        }

        if (name.startsWith("Region ")) {
            aliases.push(`Region ${numericRegion}`, String(numericRegion));
        }

        if (name.includes("Region IV-A")) {
            aliases.push("Region 4A", "Region 4-A", "4A", "4-A");
        }

        if (name.includes("National Capital Region")) {
            aliases.push("NCR");
        }

        if (name.includes("Cordillera Administrative Region")) {
            aliases.push("CAR");
        }

        if (name.includes("MIMAROPA")) {
            aliases.push("Region IV-B", "IV-B", "Region 4B", "Region 4-B", "4B", "4-B");
        }

        if (name.includes("BARMM")) {
            aliases.push("BARMM", "ARMM");
        }

        return aliases.map(normalizeRegionName);
    };

    const toNumber = (value: unknown) => {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        if (typeof value === "string") {
            const parsed = Number(value.replace(/,/g, "").trim());

            return Number.isFinite(parsed) ? parsed : 0;
        }

        return 0;
    };

    useEffect(() => {
        if (excelRows.length === 0) {
            return;
        }

        try {
            const regionLookup = new Map<string, string[]>();
            regionFeatures.forEach((region) => {
                getRegionAliases(region).forEach((alias) => {
                    regionLookup.set(alias, [getRegionId(region)]);
                });
            });
            Object.entries(regionGroupIds).forEach(([groupName, regionIds]) => {
                regionLookup.set(normalizeRegionName(groupName), regionIds);
            });

            const allowedCategories = new Set(
                splitSettingList(salesDataSettings.includedCategories).map(normalizeCategory),
            );
            const selectedCategory =
                salesDataSettings.showCategoryFilter && selectedCategoryFilter !== "all"
                    ? normalizeCategory(selectedCategoryFilter)
                    : "";
            const allowedRegionHeaders = new Set(
                splitSettingList(salesDataSettings.includedRegionColumns).map(normalizeRegionName),
            );
            const categoryColumn = salesDataSettings.categoryColumn.trim();
            const activeRows =
                (salesDataSettings.showSheetFilter && selectedSheetName !== "all") || !excelWorkbook
                    ? excelRows
                    : excelWorkbook.sheetNames.flatMap((sheetName) =>
                          getSheetRows(excelWorkbook, sheetName),
                      );
            const rowsToCount =
                selectedCategory.length > 0
                    ? activeRows.filter(
                          (row) => normalizeCategory(row[categoryColumn]) === selectedCategory,
                      )
                    : allowedCategories.size === 0
                      ? activeRows
                      : activeRows.filter((row) =>
                            allowedCategories.has(normalizeCategory(row[categoryColumn])),
                        );
            const overallRows = excelWorkbook
                ? excelWorkbook.sheetNames.flatMap((sheetName) => getSheetRows(excelWorkbook, sheetName))
                : excelRows;
            const nextSales: Record<string, number> = {};
            let nextCountrySalesTotal = 0;
            let nextOverallSalesTotal = 0;

            Object.keys(excelRows[0]).forEach((columnName) => {
                const normalizedColumn = normalizeRegionName(columnName);

                if (allowedRegionHeaders.size > 0 && !allowedRegionHeaders.has(normalizedColumn)) {
                    return;
                }

                const regionIds = regionLookup.get(normalizedColumn);

                if (!regionIds) {
                    return;
                }

                const columnTotal = rowsToCount.reduce(
                    (sum, row) => sum + toNumber(row[columnName]),
                    0,
                );

                nextCountrySalesTotal += columnTotal;
                nextOverallSalesTotal += overallRows.reduce(
                    (sum, row) => sum + toNumber(row[columnName]),
                    0,
                );
                regionIds.forEach((regionId) => {
                    nextSales[regionId] = (nextSales[regionId] ?? 0) + columnTotal;
                });
            });

            const matchedCount = Object.keys(nextSales).length;

            if (matchedCount === 0) {
                setSalesByRegion({});
                setCountrySalesTotal(0);
                setOverallSalesTotal(0);
                setExcelStatus("No Excel columns matched the current sales data settings.");
                return;
            }

            setSalesByRegion(nextSales);
            setCountrySalesTotal(nextCountrySalesTotal);
            setOverallSalesTotal(nextOverallSalesTotal);
            setExcelStatus(
                `Loaded ${formatSales(nextCountrySalesTotal)} from ${excelFileName}`,
            );
        } catch (error) {
            setExcelStatus(error instanceof Error ? error.message : "Excel settings failed.");
        }
    }, [
        excelFileName,
        excelRows,
        excelWorkbook,
        regionFeatures,
        salesDataSettings,
        selectedCategoryFilter,
    ]);

    const handleExcelUpload = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        try {
            setExcelStatus(`Reading ${file.name}...`);

            const workbook = await readExcelWorkbook(file);
            const sheetName = workbook.sheetNames[0];

            if (!sheetName) {
                throw new Error("This Excel file has no worksheets.");
            }

            setExcelWorkbook(workbook);
            setSelectedSheetName("all");
            loadSheetRows(workbook, sheetName);
            setExcelFileName(file.name);
        } catch (error) {
            setExcelStatus(error instanceof Error ? error.message : "Excel upload failed.");
        }
    };

    const handleSheetChange = (sheetName: string) => {
        if (!excelWorkbook) {
            return;
        }

        try {
            setSelectedSheetName(sheetName);
            if (sheetName === "all") {
                const rows = excelWorkbook.sheetNames.flatMap((name) =>
                    getSheetRows(excelWorkbook, name),
                );

                if (rows.length === 0) {
                    throw new Error("The workbook has no rows to read.");
                }

                setExcelRows(rows);
                setSelectedCategoryFilter("all");
                return;
            }

            loadSheetRows(excelWorkbook, sheetName);
        } catch (error) {
            setExcelStatus(error instanceof Error ? error.message : "Sheet change failed.");
        }
    };

    const formatSales = (value: number) =>
        new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    const formatOverallShare = (value: number) =>
        new Intl.NumberFormat("en-US", {
            minimumFractionDigits: overallShareDecimalPlaces,
            maximumFractionDigits: overallShareDecimalPlaces,
        }).format(value);

    return (
        <section className="map-workspace">
            <div className="map-toolbar" aria-label="Map filters">
                <label className="filter-country">
                    Country
                    <select value={country.id} onChange={() => setSelectedLevel("country")}>
                        <option value={country.id}>{country.name}</option>
                    </select>
                </label>

                {salesDataSettings.showRegionFilter && (
                    <label className="filter-region">
                        Region
                        <select
                            value={selectedLevel === "country" ? "all" : selectedRegionId}
                            onChange={(event) => handleRegionChange(event.target.value)}
                        >
                            <option value="all">All regions</option>
                            {regionFeatures.map((region) => (
                                <option
                                    key={getRegionId(region)}
                                    value={getRegionId(region)}
                                    title={getRegionName(region)}
                                >
                                    {getRegionName(region)}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <label className="filter-city">
                    City
                    <select
                        value={selectedCity.id}
                        onChange={(event) => {
                            const city = cities.find((item) => item.id === event.target.value);

                            setSelectedCityId(event.target.value);
                            setSelectedRegionId(city?.regionId ?? selectedRegionId);
                            setSelectedLevel("city");
                        }}
                    >
                        {filteredCities.map((city) => (
                            <option key={city.id} value={city.id}>
                                {city.name}
                            </option>
                        ))}
                    </select>
                </label>

                {salesDataSettings.showSheetFilter && (
                    <label className="filter-sheet">
                        Sheet
                        <select
                            value={selectedSheetName}
                            disabled={!excelWorkbook}
                            onChange={(event) => handleSheetChange(event.target.value)}
                        >
                            {!excelWorkbook && <option value="">Upload Excel first</option>}
                            {excelWorkbook && <option value="all">All sheets</option>}
                            {excelWorkbook?.sheetNames.map((sheetName) => (
                                <option key={sheetName} value={sheetName}>
                                    {sheetName}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {salesDataSettings.showCategoryFilter && (
                    <label className="filter-category">
                        Category
                        <select
                            value={selectedCategoryFilter}
                            disabled={uploadedCategories.length === 0}
                            onChange={(event) => setSelectedCategoryFilter(event.target.value)}
                        >
                            <option value="all">All categories</option>
                            {uploadedCategories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <div className="upload-actions">
                    <label className="kmz-upload">
                        KMZ Layer
                        <span className="kmz-upload-button">Upload KMZ</span>
                        <input
                            type="file"
                            accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml"
                            onChange={(event) => handleKmzUpload(event.target.files?.[0])}
                        />
                    </label>

                    <label className="file-upload">
                        Sales Data
                        <span className="file-upload-button">Upload Excel</span>
                        <input
                            type="file"
                            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                            onChange={(event) => handleExcelUpload(event.target.files?.[0])}
                        />
                    </label>
                </div>
            </div>

            <div className="map-upload-status">
                <span>{uploadStatus}</span>
                <span>{excelStatus}</span>
            </div>

            <div className="map-frame">
                <div className="counter-stack" aria-live="polite">
                    {salesDataSettings.showSalesCount && (
                        <aside className="sales-counter">
                            <span>{displayedSalesLabel}</span>
                            <strong>{formatSales(displayedSales)}</strong>
                        </aside>
                    )}
                    {salesDataSettings.showOverallCount && (
                        <aside className="sales-counter overall-counter">
                            <span>Overall Share</span>
                            <strong>{formatOverallShare(displayedOverallPercentage)}%</strong>
                        </aside>
                    )}
                </div>
                <div className="sales-map" ref={mapContainerRef} />
            </div>
        </section>
    );
}
