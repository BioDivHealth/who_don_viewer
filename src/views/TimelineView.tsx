import { useEffect, useMemo, useRef } from "react";

import * as Plot from "@observablehq/plot";

import { SectionHeader } from "@/components/SectionHeader";
import { Input } from "@/components/ui/input";
import { formatMonth } from "@/lib/format";
import { useFilterStore } from "@/store/filters";

interface TimelinePoint {
  month: string;
  disease: string;
  count: number;
}

interface TimelineViewProps {
  timelineData: TimelinePoint[];
}

export function TimelineView({ timelineData }: TimelineViewProps): JSX.Element {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const dateRange = useFilterStore((s) => s.dateRange);
  const setDateRange = useFilterStore((s) => s.setDateRange);

  const monthDomain = useMemo(() => {
    if (timelineData.length === 0) {
      return null;
    }

    const months = [...new Set(timelineData.map((entry) => entry.month))].sort();
    return {
      min: months[0],
      max: months[months.length - 1],
    };
  }, [timelineData]);

  useEffect(() => {
    if (!plotRef.current) {
      return;
    }

    plotRef.current.innerHTML = "";

    if (timelineData.length === 0) {
      return;
    }

    const chart = Plot.plot({
      marginLeft: 48,
      marginBottom: 42,
      width: 960,
      height: 370,
      style: {
        color: "var(--ink)",
        background: "transparent",
        fontFamily: '"Inter Tight", "Inter", system-ui, sans-serif',
      },
      x: {
        type: "utc",
        tickFormat: (value) => formatMonth(value.toISOString()),
      },
      y: { grid: true, label: "Record count" },
      color: { legend: true, scheme: "blues" },
      marks: [
        Plot.rectY(timelineData, {
          x: (d) => new Date(d.month),
          y: "count",
          fill: "disease",
          interval: "month",
          tip: true,
        }),
      ],
    });

    plotRef.current.append(chart);

    return () => {
      chart.remove();
    };
  }, [timelineData]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 border border-rule bg-paper p-4">
      <SectionHeader title="Timeline" />
      <p className="text-xs text-ink-muted">
        Stacked monthly records by disease (top diseases shown, tail grouped as Other).
      </p>
      <div className="min-h-0 flex-1 overflow-x-auto" ref={plotRef} />
      <div className="grid grid-cols-2 gap-2">
        <label className="label normal-case tracking-normal text-ink-muted">
          Start month
          <Input
            className="numeric mt-1"
            max={dateRange[1]}
            min={monthDomain?.min ?? ""}
            onChange={(event) => setDateRange([event.target.value, dateRange[1]])}
            type="date"
            value={dateRange[0]}
          />
        </label>
        <label className="label normal-case tracking-normal text-ink-muted">
          End month
          <Input
            className="numeric mt-1"
            max={monthDomain?.max ?? ""}
            min={dateRange[0]}
            onChange={(event) => setDateRange([dateRange[0], event.target.value])}
            type="date"
            value={dateRange[1]}
          />
        </label>
      </div>
    </div>
  );
}
