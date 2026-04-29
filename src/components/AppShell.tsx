import { useEffect, useMemo, useState } from "react";

import { ExternalLink, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { FilterSidebar } from "@/components/FilterSidebar";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { useFilterStore } from "@/store/filters";
import { useFilteredRows, useIsoCounts, useSelectedRow, useTimeline } from "@/store/derived";
import { type Meta, type Row } from "@/types";
import { InspectorPanel } from "@/views/InspectorPanel";
import { MapView } from "@/views/MapView";
import { TableView } from "@/views/TableView";
import { TimelineView } from "@/views/TimelineView";

type ActiveView = "map" | "timeline";
const FILTERS_AUTO_COLLAPSE_BREAKPOINT = 1360;
const INSPECTOR_STACK_BREAKPOINT = 1180;

interface AppShellProps {
  rows: Row[];
  meta: Meta;
}

export function AppShell({ rows, meta }: AppShellProps): JSX.Element {
  const [activeView, setActiveView] = useState<ActiveView>("map");
  const [manualSidebarCollapsed, setManualSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("who-don.filters-collapsed") === "true";
  });
  const [filtersExpandedOverride, setFiltersExpandedOverride] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("who-don.filters-collapsed-override") === "expanded";
  });
  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    if (typeof window === "undefined") {
      return 1600;
    }
    return window.innerWidth;
  });
  const filteredRows = useFilteredRows(rows);
  const countsByIso3 = useIsoCounts(filteredRows);
  const timelineData = useTimeline(filteredRows);
  const selectedRow = useSelectedRow(rows);
  const setSelectedRecordKey = useFilterStore((s) => s.setSelectedRecordKey);
  const resetFilters = useFilterStore((s) => s.reset);

  const summary = useMemo(
    () => `${formatNumber(filteredRows.length)} of ${formatNumber(meta.n_rows_total)} rows`,
    [filteredRows.length, meta.n_rows_total],
  );

  const autoCollapseFilters = viewportWidth <= FILTERS_AUTO_COLLAPSE_BREAKPOINT;
  const shouldStackInspector = viewportWidth <= INSPECTOR_STACK_BREAKPOINT;
  const sidebarCollapsed = autoCollapseFilters ? !filtersExpandedOverride : manualSidebarCollapsed;

  useEffect(() => {
    window.localStorage.setItem("who-don.filters-collapsed", String(manualSidebarCollapsed));
  }, [manualSidebarCollapsed]);

  useEffect(() => {
    window.localStorage.setItem(
      "who-don.filters-collapsed-override",
      filtersExpandedOverride ? "expanded" : "none",
    );
  }, [filtersExpandedOverride]);

  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };
    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);

    return () => {
      window.removeEventListener("resize", updateViewportWidth);
    };
  }, []);

  const handleExpandFilters = () => {
    if (autoCollapseFilters) {
      setFiltersExpandedOverride(true);
      return;
    }
    setManualSidebarCollapsed(false);
  };

  const handleCollapseFilters = () => {
    if (autoCollapseFilters) {
      setFiltersExpandedOverride(false);
      return;
    }
    setManualSidebarCollapsed(true);
  };

  const renderCanvasView = (): JSX.Element => {
    switch (activeView) {
      case "map":
        return <MapView countsByIso3={countsByIso3} rows={filteredRows} />;
      case "timeline":
        return <TimelineView timelineData={timelineData} />;
      default: {
        const unreachable: never = activeView;
        return unreachable;
      }
    }
  };

  const rootGridColumns = shouldStackInspector
    ? `${sidebarCollapsed ? "36px" : "300px"} minmax(0,1fr)`
    : `${sidebarCollapsed ? "36px" : "300px"} minmax(0,1fr) ${
        viewportWidth <= 1500 ? "minmax(300px,320px)" : "minmax(320px,360px)"
      }`;

  return (
    <div
      className="grid min-h-screen overflow-x-hidden bg-paper text-ink"
      style={{
        gridTemplateColumns: rootGridColumns,
      }}
    >
      <aside className="border-r border-rule px-3 py-5">
        {sidebarCollapsed ? (
          <div className="flex h-full flex-col items-center gap-4 pt-1">
            <button
              aria-label="Expand filters"
              className="inline-flex h-7 w-7 items-center justify-center border border-rule text-ink hover:bg-paper-2"
              onClick={handleExpandFilters}
              type="button"
            >
              <PanelLeftOpen size={14} />
            </button>
            <span className="label [writing-mode:vertical-rl]">Filters</span>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3 px-1">
            <SectionHeader
              action={
                <div className="flex items-center gap-2">
                  <button
                    className="label text-accent hover:text-accent-hover"
                    onClick={() => resetFilters(meta)}
                    type="button"
                  >
                    Reset all
                  </button>
                  <button
                    aria-label="Collapse filters"
                    className="inline-flex h-7 w-7 items-center justify-center border border-rule text-ink hover:bg-paper-2"
                    onClick={handleCollapseFilters}
                    type="button"
                  >
                    <PanelLeftClose size={14} />
                  </button>
                </div>
              }
              title="Filters"
            />
            <FilterSidebar meta={meta} rows={rows} />
          </div>
        )}
      </aside>

      <main className="relative z-0 isolate grid h-screen min-h-0 min-w-0 grid-rows-[auto_minmax(360px,48vh)_1fr_auto] gap-3 overflow-x-clip border-r border-rule px-3 py-5 max-[720px]:flex max-[720px]:h-auto max-[720px]:min-h-screen max-[720px]:flex-col lg:px-4">
        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="font-mono text-[34px] leading-none tracking-tight text-ink xl:text-[40px]">WHO DON Explorer</h1>
            <a
              className="label inline-flex items-center gap-1 text-ink hover:text-accent"
              href="https://www.who.int/emergencies/disease-outbreak-news"
              rel="noreferrer"
              target="_blank"
            >
              About WHO DON
              <ExternalLink size={12} strokeWidth={1.8} />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className={activeView === "map" ? "border-accent bg-accent text-paper hover:bg-accent-hover" : ""}
              onClick={() => setActiveView("map")}
              variant="pill"
            >
              Map
            </Button>
            <Button
              className={activeView === "timeline" ? "border-accent bg-accent text-paper hover:bg-accent-hover" : ""}
              onClick={() => setActiveView("timeline")}
              variant="pill"
            >
              Timeline
            </Button>
          </div>
        </header>

        <section className="min-h-0 min-w-0 overflow-hidden">{renderCanvasView()}</section>

        <section className="min-h-0 min-w-0 overflow-hidden">
          <TableView onSelectRecord={setSelectedRecordKey} rows={filteredRows} summary={summary} />
        </section>

        <footer className="flex items-center justify-between border-t border-rule pt-3 text-xs text-ink-muted">
          <p className="numeric" title={meta.data_source}>
            Generated at {meta.generated_at}
          </p>
          <div className="flex items-center gap-3">
            <a
              className="label text-accent hover:text-accent-hover"
              href="https://github.com/WHO-Global-Hub/new_global_maxent"
              rel="noreferrer"
              target="_blank"
            >
              Data producer repository
            </a>
          </div>
        </footer>
      </main>

      <aside
        className={
          shouldStackInspector
            ? "relative z-10 col-span-2 border-t border-rule bg-paper px-4 py-5"
            : "relative z-10 min-h-0 min-w-0 bg-paper px-4 py-5"
        }
      >
        <InspectorPanel row={selectedRow} />
      </aside>
    </div>
  );
}
