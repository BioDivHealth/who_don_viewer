import { useMemo, useState } from "react";

import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";

import { GenericLabelBadge } from "@/components/GenericLabelBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFilterStore } from "@/store/filters";
import { type Confidence, type DiseaseMeta, type Meta, type Row, type ScopeGroupMeta } from "@/types";

interface FilterSidebarProps {
  meta: Meta;
  rows: Row[];
}

interface DiseaseGroupRow {
  type: "group";
  group: string;
  label: string;
  n: number;
  diseases: DiseaseMeta[];
}

interface IndividualDiseaseRow {
  type: "disease";
  disease: DiseaseMeta;
}

type DiseaseFilterRow = DiseaseGroupRow | IndividualDiseaseRow;

function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function formatDiseaseGroupLabel(value: string): string {
  return value.replace(/\s*\[all\]$/i, "");
}

const confidenceGroups: ReadonlyArray<{ label: string; values: readonly Confidence[] }> = [
  { label: "High", values: ["high", "manual_override_high"] as const },
  { label: "Medium", values: ["medium"] as const },
  { label: "Not applicable", values: ["not_applicable"] as const },
];
const FILTER_PREVIEW_LIMIT = 14;
const SCOPE_GROUP_ORDER = ["focal", "not_event_country", "background_or_context", "imported_or_secondary", "review"];

function sortScopeGroups(scopeGroups: ScopeGroupMeta[]): ScopeGroupMeta[] {
  return [...scopeGroups].sort((a, b) => {
    const aIndex = SCOPE_GROUP_ORDER.indexOf(a.scope_group);
    const bIndex = SCOPE_GROUP_ORDER.indexOf(b.scope_group);
    const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

    return aRank - bRank || b.n - a.n || a.scope_group.localeCompare(b.scope_group);
  });
}

export function FilterSidebar({ meta, rows }: FilterSidebarProps): JSX.Element {
  const [diseaseQuery, setDiseaseQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [showAllDiseases, setShowAllDiseases] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [collapsedDiseaseGroups, setCollapsedDiseaseGroups] = useState<Set<string>>(
    () => new Set(meta.disease_groups.map((entry) => entry.disease_group)),
  );

  const scopeGroups = useFilterStore((s) => s.scopeGroups);
  const diseases = useFilterStore((s) => s.diseases);
  const diseaseGroups = useFilterStore((s) => s.diseaseGroups);
  const countries = useFilterStore((s) => s.countries);
  const dateRange = useFilterStore((s) => s.dateRange);
  const confidence = useFilterStore((s) => s.confidence);
  const setScopeGroups = useFilterStore((s) => s.setScopeGroups);
  const setDiseases = useFilterStore((s) => s.setDiseases);
  const setDiseaseGroups = useFilterStore((s) => s.setDiseaseGroups);
  const setCountries = useFilterStore((s) => s.setCountries);
  const setDateRange = useFilterStore((s) => s.setDateRange);
  const setConfidence = useFilterStore((s) => s.setConfidence);
  const reset = useFilterStore((s) => s.reset);

  const genericSet = useMemo(() => new Set(meta.generic_disease_labels), [meta.generic_disease_labels]);
  const sortedScopeGroups = useMemo(() => sortScopeGroups(meta.scope_groups), [meta.scope_groups]);
  const showNotApplicableConfidence = scopeGroups.size !== 1 || !scopeGroups.has("focal");
  const useStrictFilterMeta = scopeGroups.size === 1 && scopeGroups.has("focal");
  const baseDiseases = useStrictFilterMeta && meta.strict_diseases ? meta.strict_diseases : meta.diseases;
  const baseDiseaseGroups =
    useStrictFilterMeta && meta.strict_disease_groups ? meta.strict_disease_groups : meta.disease_groups;
  const baseCountries = useStrictFilterMeta && meta.strict_countries ? meta.strict_countries : meta.countries;

  const diseaseFilterRows = useMemo<DiseaseFilterRow[]>(() => {
    const diseaseToGroup = new Map<string, string>();

    for (const row of rows) {
      if (row.disease_group) {
        diseaseToGroup.set(row.disease, row.disease_group);
      }
    }

    const diseasesByGroup = new Map<string, DiseaseMeta[]>();
    const ungroupedDiseases: DiseaseMeta[] = [];

    for (const disease of baseDiseases) {
      const group = diseaseToGroup.get(disease.disease);
      if (!group) {
        ungroupedDiseases.push(disease);
        continue;
      }

      const groupDiseases = diseasesByGroup.get(group) ?? [];
      groupDiseases.push(disease);
      diseasesByGroup.set(group, groupDiseases);
    }

    const groups: DiseaseGroupRow[] = baseDiseaseGroups.map((entry) => ({
      type: "group",
      group: entry.disease_group,
      label: entry.disease_group_display,
      n: entry.n,
      diseases: diseasesByGroup.get(entry.disease_group) ?? [],
    }));

    return [
      ...groups,
      ...ungroupedDiseases.map((disease) => ({
        type: "disease" as const,
        disease,
      })),
    ];
  }, [baseDiseaseGroups, baseDiseases, rows]);

  const visibleDiseaseRows = useMemo(() => {
    const query = diseaseQuery.trim().toLowerCase();
    if (!query) {
      return diseaseFilterRows;
    }

    return diseaseFilterRows
      .map((entry): DiseaseFilterRow | null => {
        if (entry.type === "disease") {
          return entry.disease.disease.toLowerCase().includes(query) ? entry : null;
        }

        const groupMatches = entry.label.toLowerCase().includes(query) || entry.group.toLowerCase().includes(query);
        const matchingDiseases = entry.diseases.filter((disease) =>
          disease.disease.toLowerCase().includes(query),
        );

        if (!groupMatches && matchingDiseases.length === 0) {
          return null;
        }

        return {
          ...entry,
          diseases: groupMatches ? entry.diseases : matchingDiseases,
        };
      })
      .filter((entry): entry is DiseaseFilterRow => entry !== null);
  }, [diseaseFilterRows, diseaseQuery]);

  const visibleCountries = useMemo(
    () => baseCountries.filter((entry) => entry.country.toLowerCase().includes(countryQuery.trim().toLowerCase())),
    [baseCountries, countryQuery],
  );

  const diseaseRows = showAllDiseases ? visibleDiseaseRows : visibleDiseaseRows.slice(0, FILTER_PREVIEW_LIMIT);
  const countryRows = showAllCountries ? visibleCountries : visibleCountries.slice(0, FILTER_PREVIEW_LIMIT);

  const onConfidenceToggle = (values: readonly Confidence[]) => {
    const next = new Set(confidence);
    const hasEveryValue = values.every((value) => next.has(value));

    for (const value of values) {
      if (hasEveryValue) {
        next.delete(value);
      } else {
        next.add(value);
      }
    }

    setConfidence(next);
  };

  const onDiseaseGroupCollapseToggle = (group: string) => {
    setCollapsedDiseaseGroups((current) => toggleSetValue(current, group));
  };

  return (
    <aside className="flex h-full flex-col gap-4 overflow-hidden">
      <section className="space-y-2">
        <SectionHeader title="Date range" />
        <div className="grid grid-cols-2 gap-2">
          <Input
            className="numeric px-2 text-xs"
            max={dateRange[1]}
            min={meta.date_min}
            onChange={(event) => setDateRange([event.target.value, dateRange[1]])}
            type="date"
            value={dateRange[0]}
          />
          <Input
            className="numeric px-2 text-xs"
            max={meta.date_max}
            min={dateRange[0]}
            onChange={(event) => setDateRange([dateRange[0], event.target.value])}
            type="date"
            value={dateRange[1]}
          />
        </div>
      </section>

      <section className="space-y-2 border-t border-rule pt-4">
        <SectionHeader title="Scope" />
        <div className="space-y-1">
          {sortedScopeGroups.map((entry) => (
            <label className="flex items-center gap-2 text-sm text-ink" key={entry.scope_group}>
              <input
                checked={scopeGroups.has(entry.scope_group)}
                className="h-4 w-4 accent-accent"
                onChange={() => setScopeGroups(toggleSetValue(scopeGroups, entry.scope_group))}
                type="checkbox"
              />
              <span className="flex-1 truncate" title={entry.scope_group_display}>
                {entry.scope_group_display}
              </span>
              <span className="numeric text-xs text-ink-muted">{entry.n}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2 border-t border-rule pt-4">
        <SectionHeader title="Evidence confidence" />
        <div className="grid grid-cols-2 gap-2">
          {confidenceGroups
            .filter((group) => group.values[0] !== "not_applicable" || showNotApplicableConfidence)
            .map((group) => (
            <button
              className={
                group.values.every((value) => confidence.has(value))
                  ? "h-8 border border-accent bg-accent px-2 font-mono text-[11px] uppercase tracking-normal text-paper"
                  : "h-8 border border-rule bg-paper px-2 font-mono text-[11px] uppercase tracking-normal text-ink hover:bg-paper-2"
              }
              key={group.label}
              onClick={() => onConfidenceToggle(group.values)}
              type="button"
              >
                {group.label}
              </button>
            ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-2 border-t border-rule pt-4">
        <SectionHeader title="Diseases" />
        <Input onChange={(event) => setDiseaseQuery(event.target.value)} placeholder="Filter diseases" value={diseaseQuery} />
        <div className="min-h-0 max-h-[380px] space-y-1 overflow-y-auto pr-1">
          {diseaseRows.map((entry, index) =>
            entry.type === "group" ? (
              <div
                className={
                  diseaseRows[index + 1]?.type === "disease"
                    ? "mb-2 space-y-1 border-b border-rule pb-2"
                    : "space-y-1"
                }
                key={entry.group}
              >
                <div className="flex items-center gap-2 text-sm text-ink">
                  <input
                    checked={diseaseGroups.has(entry.group)}
                    className="h-4 w-4 accent-accent"
                    onChange={() => setDiseaseGroups(toggleSetValue(diseaseGroups, entry.group))}
                    type="checkbox"
                  />
                  <button
                    aria-label={`${collapsedDiseaseGroups.has(entry.group) ? "Expand" : "Collapse"} ${entry.label}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center text-ink-muted hover:text-ink"
                    onClick={() => onDiseaseGroupCollapseToggle(entry.group)}
                    type="button"
                  >
                    {collapsedDiseaseGroups.has(entry.group) ? (
                      <ChevronRight size={13} strokeWidth={1.8} />
                    ) : (
                      <ChevronDown size={13} strokeWidth={1.8} />
                    )}
                  </button>
                  <span className="flex-1 truncate font-medium" title={entry.label}>
                    {formatDiseaseGroupLabel(entry.label)}
                  </span>
                  <span className="label shrink-0 normal-case tracking-normal">group</span>
                  <span className="numeric text-xs text-ink-muted">{entry.n}</span>
                </div>
                <div className={collapsedDiseaseGroups.has(entry.group) ? "hidden" : "space-y-1 pl-10"}>
                  {entry.diseases.map((disease) => (
                    <label className="flex items-center gap-2 text-sm text-ink" key={disease.disease}>
                      <input
                        checked={diseases.has(disease.disease)}
                        className="h-4 w-4 accent-accent"
                        onChange={() => setDiseases(toggleSetValue(diseases, disease.disease))}
                        type="checkbox"
                      />
                      <span className="flex-1 truncate" title={disease.disease}>
                        {disease.disease}
                      </span>
                      <span className="numeric text-xs text-ink-muted">{disease.n}</span>
                      {genericSet.has(disease.disease) ? <GenericLabelBadge /> : null}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-sm text-ink" key={entry.disease.disease}>
                <input
                  checked={diseases.has(entry.disease.disease)}
                  className="h-4 w-4 accent-accent"
                  onChange={() => setDiseases(toggleSetValue(diseases, entry.disease.disease))}
                  type="checkbox"
                />
                <span aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span className="flex-1 truncate" title={entry.disease.disease}>
                  {entry.disease.disease}
                </span>
                <span className="numeric text-xs text-ink-muted">{entry.disease.n}</span>
                {genericSet.has(entry.disease.disease) ? <GenericLabelBadge /> : null}
              </label>
            ),
          )}
        </div>
        {visibleDiseaseRows.length > FILTER_PREVIEW_LIMIT ? (
          <Button
            className="h-7 self-start px-0 text-ink-muted hover:text-ink"
            onClick={() => setShowAllDiseases((value) => !value)}
            variant="ghost"
          >
            {showAllDiseases ? (
              <>
                Show less <ChevronUp size={14} />
              </>
            ) : (
              <>
                Show all ({visibleDiseaseRows.length}) <ChevronDown size={14} />
              </>
            )}
          </Button>
        ) : null}
      </section>

      <section className="flex min-h-0 flex-col gap-2 border-t border-rule pt-3">
        <SectionHeader title="Countries" />
        <Input onChange={(event) => setCountryQuery(event.target.value)} placeholder="Filter countries" value={countryQuery} />
        <div className="min-h-0 max-h-[380px] space-y-1 overflow-y-auto pr-1">
          {countryRows.map((entry) => (
            <label className="flex items-center gap-2 text-sm text-ink" key={entry.country}>
              <input
                checked={countries.has(entry.country)}
                className="h-4 w-4 accent-accent"
                onChange={() => setCountries(toggleSetValue(countries, entry.country))}
                type="checkbox"
              />
              <span className="flex-1 truncate">{entry.country}</span>
              <span className="numeric text-xs text-ink-muted">{entry.n}</span>
            </label>
          ))}
        </div>
        {visibleCountries.length > FILTER_PREVIEW_LIMIT ? (
          <Button
            className="h-7 self-start px-0 text-ink-muted hover:text-ink"
            onClick={() => setShowAllCountries((value) => !value)}
            variant="ghost"
          >
            {showAllCountries ? (
              <>
                Show less <ChevronUp size={14} />
              </>
            ) : (
              <>
                Show all ({visibleCountries.length}) <ChevronDown size={14} />
              </>
            )}
          </Button>
        ) : null}
      </section>

      <div className="border-t border-rule pt-3">
        <Button className="w-full" onClick={() => reset(meta)} variant="outline">
          Clear filters
        </Button>
      </div>
    </aside>
  );
}
