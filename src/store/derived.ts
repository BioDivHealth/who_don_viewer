import { useMemo } from "react";

import { useFilterStore } from "@/store/filters";
import { getDiseaseLabel } from "@/lib/format";
import { type Row } from "@/types";

interface TimelineBucket {
  month: string;
  disease: string;
  count: number;
}

function inRange(value: string, [start, end]: [string, string]): boolean {
  return value >= start && value <= end;
}

export function applyFilters(rows: Row[]): Row[] {
  const { scopeGroups, diseases, diseaseGroups, countries, dateRange, confidence, eventCountryOnly, needsReviewOnly } =
    useFilterStore.getState();

  return rows.filter((row) => {
    if (scopeGroups.size === 0 || !scopeGroups.has(row.scope_group)) {
      return false;
    }

    if (eventCountryOnly && !row.event_country) {
      return false;
    }

    if (needsReviewOnly && !row.needs_review) {
      return false;
    }

    if (
      (diseases.size > 0 || diseaseGroups.size > 0) &&
      !diseases.has(row.disease) &&
      (!row.disease_group || !diseaseGroups.has(row.disease_group))
    ) {
      return false;
    }

    if (countries.size > 0 && !countries.has(row.country)) {
      return false;
    }

    if (row.confidence !== "manual_override_keep_non_strict" && confidence.size > 0 && !confidence.has(row.confidence)) {
      return false;
    }

    return inRange(row.date, dateRange);
  });
}

export function buildIsoCounts(rows: Row[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!row.iso3) {
      continue;
    }

    counts.set(row.iso3, (counts.get(row.iso3) ?? 0) + 1);
  }

  return counts;
}

export function buildTimeline(rows: Row[], topN = 8): TimelineBucket[] {
  const diseaseCounts = new Map<string, number>();
  const monthDiseaseCounts = new Map<string, number>();

  for (const row of rows) {
    const diseaseLabel = getDiseaseLabel(row);
    diseaseCounts.set(diseaseLabel, (diseaseCounts.get(diseaseLabel) ?? 0) + 1);
  }

  const topDiseases = new Set(
    [...diseaseCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([disease]) => disease),
  );

  for (const row of rows) {
    const month = `${row.date.slice(0, 7)}-01`;
    const diseaseLabel = getDiseaseLabel(row);
    const disease = topDiseases.has(diseaseLabel) ? diseaseLabel : "Other";
    const key = `${month}__${disease}`;
    monthDiseaseCounts.set(key, (monthDiseaseCounts.get(key) ?? 0) + 1);
  }

  return [...monthDiseaseCounts.entries()]
    .map(([key, count]) => {
      const [month, disease] = key.split("__");
      return { month, disease, count };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function useFilteredRows(rows: Row[]): Row[] {
  const scopeGroups = useFilterStore((s) => s.scopeGroups);
  const diseases = useFilterStore((s) => s.diseases);
  const diseaseGroups = useFilterStore((s) => s.diseaseGroups);
  const countries = useFilterStore((s) => s.countries);
  const dateRange = useFilterStore((s) => s.dateRange);
  const confidence = useFilterStore((s) => s.confidence);
  const eventCountryOnly = useFilterStore((s) => s.eventCountryOnly);
  const needsReviewOnly = useFilterStore((s) => s.needsReviewOnly);

  return useMemo(
    () =>
      rows.filter((row) => {
        if (scopeGroups.size === 0 || !scopeGroups.has(row.scope_group)) {
          return false;
        }

        if (eventCountryOnly && !row.event_country) {
          return false;
        }

        if (needsReviewOnly && !row.needs_review) {
          return false;
        }

        if (
          (diseases.size > 0 || diseaseGroups.size > 0) &&
          !diseases.has(row.disease) &&
          (!row.disease_group || !diseaseGroups.has(row.disease_group))
        ) {
          return false;
        }

        if (countries.size > 0 && !countries.has(row.country)) {
          return false;
        }

        if (row.confidence !== "manual_override_keep_non_strict" && confidence.size > 0 && !confidence.has(row.confidence)) {
          return false;
        }

        return inRange(row.date, dateRange);
      }),
    [
      rows,
      scopeGroups,
      diseases,
      diseaseGroups,
      countries,
      dateRange,
      confidence,
      eventCountryOnly,
      needsReviewOnly,
    ],
  );
}

export function useIsoCounts(rows: Row[]): Map<string, number> {
  return useMemo(() => buildIsoCounts(rows), [rows]);
}

export function useTimeline(rows: Row[]): TimelineBucket[] {
  return useMemo(() => buildTimeline(rows), [rows]);
}

export function useSelectedRow(rows: Row[]): Row | null {
  const selectedRowKey = useFilterStore((s) => s.selectedRowKey);

  return useMemo(() => {
    if (!selectedRowKey) {
      return null;
    }

    return rows.find((row) => row.row_key === selectedRowKey) ?? null;
  }, [rows, selectedRowKey]);
}
