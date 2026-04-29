import { useEffect, useMemo, useState } from "react";

import { ExternalLink, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

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

const GITHUB_MARK_PATH =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.415-4.042-1.415-1.088-.746.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

function GitHubMark({ className }: { className?: string }): JSX.Element {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24">
      <path d={GITHUB_MARK_PATH} fill="currentColor" />
    </svg>
  );
}

interface AppShellProps {
  rows: Row[];
  meta: Meta;
}

export function AppShell({ rows, meta }: AppShellProps): JSX.Element {
  const [activeView, setActiveView] = useState<ActiveView>("map");
  const [aboutDataOpen, setAboutDataOpen] = useState(false);
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
  const setSelectedRowKey = useFilterStore((s) => s.setSelectedRowKey);
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
            <div className="space-y-1">
              <h1 className="font-mono text-[34px] leading-none tracking-tight text-ink xl:text-[40px]">
                DON Explorer
              </h1>
              <p className="text-sm text-ink-muted">Independent explorer of WHO Disease Outbreak News reports</p>
            </div>
            <button
              className="label rounded border border-rule bg-paper px-2.5 py-1.5 text-ink transition-colors hover:border-accent hover:text-accent"
              onClick={() => setAboutDataOpen(true)}
              type="button"
            >
              About data
            </button>
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
          <TableView onSelectRowKey={setSelectedRowKey} rows={filteredRows} summary={summary} />
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3 text-xs text-ink-muted">
          <div className="max-w-3xl space-y-1">
            <p>
              Based on/extracted from World Health Organization Disease Outbreak News reports. Product/app/website.
              Not affiliated with or endorsed by WHO.
            </p>
            <p className="numeric" title={meta.data_source}>
              Generated at {meta.generated_at}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-8 gap-y-2">
            <a
              className="label inline-flex items-center gap-1 text-accent hover:text-accent-hover"
              href="https://www.who.int/emergencies/disease-outbreak-news"
              rel="noreferrer"
              target="_blank"
            >
              WHO Disease Outbreak News
              <ExternalLink className="shrink-0" size={12} strokeWidth={1.8} />
            </a>
            <a
              className="label inline-flex items-center gap-1.5 text-accent hover:text-accent-hover"
              href="https://github.com/BioDivHealth/who_don_viewer"
              rel="noreferrer"
              target="_blank"
            >
              <GitHubMark className="size-3 shrink-0" />
              App source
              <ExternalLink className="shrink-0" size={12} strokeWidth={1.8} />
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

      {aboutDataOpen ? (
        <div
          aria-labelledby="about-data-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 px-4"
          role="dialog"
        >
          <section className="w-full max-w-xl border border-rule bg-paper shadow-[0_18px_60px_rgba(26,23,20,0.18)]">
            <div className="flex items-start justify-between gap-4 border-b border-rule p-4">
              <div className="space-y-1">
                <p className="label">Methodology</p>
                <h2 className="font-mono text-xl text-ink" id="about-data-title">
                  About the data
                </h2>
              </div>
              <button
                aria-label="Close about data"
                className="inline-flex h-8 w-8 items-center justify-center border border-rule text-ink hover:bg-paper-2"
                onClick={() => setAboutDataOpen(false)}
                type="button"
              >
                <X size={15} strokeWidth={1.8} />
              </button>
            </div>
            <div className="space-y-4 p-4 text-sm leading-relaxed text-ink">
              <p>
                This explorer uses publicly available World Health Organization Disease Outbreak News reports as
                source material. DON article titles, publication dates, URLs, and evidence text are attributed to WHO.
              </p>
              <p>
                Country, disease, focal-scope, confidence, and review fields are derived from an independent extraction
                and cleaning pipeline and should not be interpreted as WHO classifications or endorsements.
              </p>
              <p className="text-ink-muted">
                Row counts are DON event-evidence records, not case counts. Each inspected row links back to its source
                WHO article where available.
              </p>
              <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
                <a
                  className="label inline-flex items-center gap-1 text-accent hover:text-accent-hover"
                  href="https://www.who.int/emergencies/disease-outbreak-news"
                  rel="noreferrer"
                  target="_blank"
                >
                  WHO Disease Outbreak News
                  <ExternalLink size={12} strokeWidth={1.8} />
                </a>
                <a
                  className="label inline-flex items-center gap-1.5 text-accent hover:text-accent-hover"
                  href="https://github.com/BioDivHealth/who_don_viewer"
                  rel="noreferrer"
                  target="_blank"
                >
                  <GitHubMark className="size-3 shrink-0" />
                  App source
                  <ExternalLink size={12} strokeWidth={1.8} />
                </a>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
