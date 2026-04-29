import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { interpolateBlues } from "d3-scale-chromatic";
import { scaleSequentialLog } from "d3-scale";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

import { SectionHeader } from "@/components/SectionHeader";
import { getDiseaseLabel } from "@/lib/format";
import { useFilterStore } from "@/store/filters";
import { type Row } from "@/types";

const WORLD_GEO_URL = "/world/countries.json";
const DEFAULT_CENTER: [number, number] = [0, 8];
const BASE_MAP_WIDTH = 980;
const BASE_MAP_HEIGHT = 440;
const BASE_PROJECTION_SCALE = 165;

/** ISO3 / world-atlas name — no DON rows expected; drop polygon so the map frames inhabited land. */
function isAntarcticaFeature(iso3: string, name: string): boolean {
  return iso3 === "ATA" || name === "Antarctica";
}

interface MapViewProps {
  rows: Row[];
  countsByIso3: Map<string, number>;
}

interface HoverState {
  countryName: string;
  iso3: string;
  count: number;
  topDiseases: Array<{ disease: string; n: number }>;
}

/** One pass over filtered rows — O(n) — avoid scanning all rows on every map hover. */
function buildTopDiseasesByIso3(rows: Row[]): Map<string, Array<{ disease: string; n: number }>> {
  const perIso = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (!row.iso3) {
      continue;
    }
    let diseaseCounts = perIso.get(row.iso3);
    if (!diseaseCounts) {
      diseaseCounts = new Map<string, number>();
      perIso.set(row.iso3, diseaseCounts);
    }
    const diseaseLabel = getDiseaseLabel(row);
    diseaseCounts.set(diseaseLabel, (diseaseCounts.get(diseaseLabel) ?? 0) + 1);
  }

  const result = new Map<string, Array<{ disease: string; n: number }>>();
  for (const [iso3, counts] of perIso) {
    const top = [...counts.entries()]
      .map(([disease, n]) => ({ disease, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 3);
    result.set(iso3, top);
  }

  return result;
}

function buildCountryNamesByIso3(rows: Row[]): Map<string, string[]> {
  const countryNamesByIso3 = new Map<string, Set<string>>();

  for (const row of rows) {
    if (!row.iso3) {
      continue;
    }

    const countryNames = countryNamesByIso3.get(row.iso3) ?? new Set<string>();
    countryNames.add(row.country);
    countryNamesByIso3.set(row.iso3, countryNames);
  }

  const result = new Map<string, string[]>();
  for (const [iso3, countryNames] of countryNamesByIso3) {
    result.set(iso3, [...countryNames].sort((a, b) => a.localeCompare(b)));
  }

  return result;
}

export function MapView({ rows, countsByIso3 }: MapViewProps): JSX.Element {
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const [zoom, setZoom] = useState(1);
  /** Match projection framing after omitting Antarctica — slight north bias. */
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const [mapSize, setMapSize] = useState<{ width: number; height: number }>({ width: 980, height: 440 });
  const countries = useFilterStore((s) => s.countries);
  const setCountries = useFilterStore((s) => s.setCountries);

  const maxCount = useMemo(() => {
    const values = [...countsByIso3.values()];
    return values.length > 0 ? Math.max(...values) : 1;
  }, [countsByIso3]);

  const colorScale = useMemo(
    () => scaleSequentialLog(interpolateBlues).domain([1, Math.max(2, maxCount)]),
    [maxCount],
  );

  const topDiseasesByIso3 = useMemo(() => buildTopDiseasesByIso3(rows), [rows]);
  const countryNamesByIso3 = useMemo(() => buildCountryNamesByIso3(rows), [rows]);
  const selectedCountrySummary = useMemo(() => {
    if (countries.size === 0) {
      return null;
    }

    const selectedNames = [...countries].sort((a, b) => a.localeCompare(b));
    const selectedNameSet = new Set(selectedNames);
    let records = 0;
    const diseaseCounts = new Map<string, number>();

    for (const row of rows) {
      if (!selectedNameSet.has(row.country)) {
        continue;
      }
      records += 1;
      const diseaseLabel = getDiseaseLabel(row);
      diseaseCounts.set(diseaseLabel, (diseaseCounts.get(diseaseLabel) ?? 0) + 1);
    }

    const topDiseases = [...diseaseCounts.entries()]
      .map(([disease, n]) => ({ disease, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 3);

    return {
      selectedNames,
      records,
      topDiseases,
    };
  }, [countries, rows]);
  const projectionScale = useMemo(() => {
    const widthScale = mapSize.width / BASE_MAP_WIDTH;
    const heightScale = mapSize.height / BASE_MAP_HEIGHT;
    /** Keep full-world framing stable even when the map viewport is short. */
    return Math.min(widthScale, heightScale) * BASE_PROJECTION_SCALE;
  }, [mapSize.height, mapSize.width]);

  const onCountryClick = useCallback(
    (iso3: string, countryName: string) => {
      const countryNames = countryNamesByIso3.get(iso3) ?? [countryName];
      const next = new Set(countries);

      if (countryNames.every((name) => next.has(name))) {
        for (const name of countryNames) {
          next.delete(name);
        }
      } else {
        for (const name of countryNames) {
          next.add(name);
        }
      }

      setCountries(next);
    },
    [countries, countryNamesByIso3, setCountries],
  );

  const resetFit = useCallback(() => {
    setCenter(DEFAULT_CENTER);
    setZoom(1);
  }, []);

  useEffect(() => {
    if (!mapViewportRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      /** Never wider than the map column — a forced min width here overflowed into the inspector at narrow viewports. */
      const width = Math.max(120, Math.floor(entry.contentRect.width));
      const measuredHeight = Math.floor(entry.contentRect.height);
      const height = Math.max(320, Math.min(520, measuredHeight > 0 ? measuredHeight : Math.floor(width * 0.45)));
      setMapSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    });

    observer.observe(mapViewportRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      resetFit();
    }, 120);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [mapSize.width, resetFit]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden border border-rule bg-paper p-4">
      <SectionHeader
        action={<span className="label normal-case tracking-normal text-ink-muted">Rows are event records, not case counts.</span>}
        title="Map"
      />
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden border border-rule">
        <div className="absolute left-3 top-3 z-10 flex flex-col border border-rule bg-paper">
          <button
            className="h-8 w-8 border-b border-rule text-ink hover:bg-paper-2"
            onClick={() => setZoom((value) => Math.min(value + 0.35, 4))}
            type="button"
          >
            +
          </button>
          <button
            className="h-8 w-8 border-b border-rule text-ink hover:bg-paper-2"
            onClick={() => setZoom((value) => Math.max(value - 0.35, 1))}
            type="button"
          >
            -
          </button>
          <button
            className="h-8 w-8 text-xs text-ink hover:bg-paper-2"
            onClick={resetFit}
            type="button"
          >
            fit
          </button>
        </div>
        <div className="h-full min-w-0 max-w-full" ref={mapViewportRef}>
          <ComposableMap
            projectionConfig={{ scale: projectionScale, center: DEFAULT_CENTER }}
            width={mapSize.width}
            height={mapSize.height}
          >
            <ZoomableGroup
              center={center}
              onMoveEnd={(position) => {
                setCenter(position.coordinates as [number, number]);
                setZoom(position.zoom);
              }}
              zoom={zoom}
            >
              <Geographies geography={WORLD_GEO_URL}>
                {({ geographies }) =>
                  geographies
                    .filter((geo) => {
                      const iso3 = String(geo.properties["ISO3166-1-Alpha-3"] ?? "");
                      const name = String(geo.properties.name ?? "");
                      return !isAntarcticaFeature(iso3, name);
                    })
                    .map((geo) => {
                      const iso3 = String(geo.properties["ISO3166-1-Alpha-3"] ?? "");
                      const countryName = String(geo.properties.name ?? "");
                      const count = countsByIso3.get(iso3) ?? 0;
                      const fill = count > 0 ? colorScale(count) : "#ebe5da";
                      const topDiseases = topDiseasesByIso3.get(iso3) ?? [];

                      return (
                        <Geography
                          fill={fill}
                          geography={geo}
                          key={geo.rsmKey}
                          onClick={() => onCountryClick(iso3, countryName)}
                          onMouseEnter={() =>
                            setHoverState((current) =>
                              current?.iso3 === iso3
                                ? current
                                : {
                                    countryName,
                                    iso3,
                                    count,
                                    topDiseases,
                                  },
                            )
                          }
                          onMouseLeave={() => setHoverState((current) => (current?.iso3 === iso3 ? null : current))}
                          stroke="#c7bfb2"
                          strokeWidth={0.3}
                          style={{
                            default: { outline: "none" },
                            hover: { outline: "none", fill: "#76aadb" },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </div>

      <div className="h-[72px] shrink-0 border border-rule bg-paper-2 p-2 text-xs text-ink">
        <p className="font-mono text-[11px] uppercase tracking-label text-ink-muted">
          {selectedCountrySummary
            ? selectedCountrySummary.selectedNames.length === 1
              ? selectedCountrySummary.selectedNames[0]
              : `${selectedCountrySummary.selectedNames.length} selected countries`
            : hoverState
              ? hoverState.countryName
              : "Country"}
        </p>
        <p className="numeric">
          {selectedCountrySummary ? `Records: ${selectedCountrySummary.records}` : hoverState ? `Records: ${hoverState.count}` : "Records: -"}
        </p>
        <p className={selectedCountrySummary || hoverState ? "truncate" : "text-ink-muted"}>
          {selectedCountrySummary
            ? selectedCountrySummary.topDiseases.length > 0
              ? `Top diseases: ${selectedCountrySummary.topDiseases.map((d) => `${d.disease} (${d.n})`).join(", ")}`
              : selectedCountrySummary.selectedNames.length > 1
                ? `Countries: ${selectedCountrySummary.selectedNames.join(", ")}`
                : "No matching records."
            : hoverState
              ? hoverState.topDiseases.length > 0
                ? `Top diseases: ${hoverState.topDiseases.map((d) => `${d.disease} (${d.n})`).join(", ")}`
                : "No matching records."
              : "Hover for details, click a country to filter."}
        </p>
      </div>
    </div>
  );
}
