import { create } from "zustand";

import { type Confidence, type Meta } from "@/types";

export const confidenceOptions: readonly Confidence[] = [
  "high",
  "medium",
  "manual_override_high",
  "not_applicable",
];
const defaultConfidence: ReadonlySet<Confidence> = new Set(confidenceOptions);
const emptyDateRange: [string, string] = ["", ""];

function defaultScopeGroups(meta: Meta): Set<string> {
  if (meta.scope_groups.some((entry) => entry.scope_group === "focal")) {
    return new Set(["focal"]);
  }

  return new Set(meta.scope_groups.map((entry) => entry.scope_group));
}

interface FilterState {
  scopeGroups: Set<string>;
  diseases: Set<string>;
  diseaseGroups: Set<string>;
  countries: Set<string>;
  dateRange: [string, string];
  confidence: Set<Confidence>;
  eventCountryOnly: boolean;
  needsReviewOnly: boolean;
  selectedRecordKey: string | null;
  initializeFromMeta: (meta: Meta) => void;
  setScopeGroups: (values: Set<string>) => void;
  setDiseases: (values: Set<string>) => void;
  setDiseaseGroups: (values: Set<string>) => void;
  setCountries: (values: Set<string>) => void;
  setDateRange: (value: [string, string]) => void;
  setConfidence: (values: Set<Confidence>) => void;
  setEventCountryOnly: (value: boolean) => void;
  setNeedsReviewOnly: (value: boolean) => void;
  setSelectedRecordKey: (value: string | null) => void;
  reset: (meta: Meta) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  scopeGroups: new Set<string>(),
  diseases: new Set<string>(),
  diseaseGroups: new Set<string>(),
  countries: new Set<string>(),
  dateRange: emptyDateRange,
  confidence: new Set(defaultConfidence),
  eventCountryOnly: false,
  needsReviewOnly: false,
  selectedRecordKey: null,
  initializeFromMeta: (meta) =>
    set((state) => ({
      ...state,
      dateRange: [meta.date_min, meta.date_max],
      scopeGroups: state.scopeGroups.size > 0 ? state.scopeGroups : defaultScopeGroups(meta),
    })),
  setScopeGroups: (values) => set({ scopeGroups: new Set(values) }),
  setDiseases: (values) => set({ diseases: new Set(values) }),
  setDiseaseGroups: (values) => set({ diseaseGroups: new Set(values) }),
  setCountries: (values) => set({ countries: new Set(values) }),
  setDateRange: (value) => set({ dateRange: value }),
  setConfidence: (values) => set({ confidence: new Set(values) }),
  setEventCountryOnly: (value) => set({ eventCountryOnly: value }),
  setNeedsReviewOnly: (value) => set({ needsReviewOnly: value }),
  setSelectedRecordKey: (value) => set({ selectedRecordKey: value }),
  reset: (meta) =>
    set({
      scopeGroups: defaultScopeGroups(meta),
      diseases: new Set<string>(),
      diseaseGroups: new Set<string>(),
      countries: new Set<string>(),
      dateRange: [meta.date_min, meta.date_max],
      confidence: new Set(defaultConfidence),
      eventCountryOnly: false,
      needsReviewOnly: false,
      selectedRecordKey: null,
    }),
}));
