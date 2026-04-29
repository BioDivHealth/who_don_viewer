export type Confidence =
  | "high"
  | "medium"
  | "manual_override_high"
  | "manual_override_keep_non_strict"
  | "not_applicable";
export type EventLayerConfidence = "high" | "medium" | "low";
export type Source = "deterministic" | "llm";
export type BooleanLike = boolean | "TRUE" | "FALSE";

export interface Row {
  record_key: string;
  don_id: string;
  record_id: string;
  title: string;
  date: string;
  article_url: string;
  country: string;
  iso3: string | null;
  disease: string;
  disease_display: string;
  disease_downstream: string;
  disease_group: string | null;
  disease_group_display: string | null;
  disease_standard: string;
  disease_refined: string;
  disease_raw: string;
  influenza_type: string | null;
  influenza_subtype: string | null;
  is_generic_label: boolean;
  country_role: string;
  event_country: boolean;
  confidence: Confidence;
  scope_confidence: Confidence;
  event_layer_confidence: EventLayerConfidence;
  event_layer_reasoning: string;
  event_layer_needs_review: boolean;
  evidence: string | null;
  reasoning: string;
  event_reasoning: string;
  source: Source;
  needs_review: boolean;
  legacy_event_review_flag: boolean;
  final_don_ready_for_downstream: boolean;
  disease_refinement_review_status: string;
  evidence_sentence: string | null;
  trigger_phrase: string | null;
  exclusion_phrase: string | null;
  include_in_strict_modelling: boolean;
  is_context_only: boolean;
  scope: string;
  scope_display: string;
  scope_group: string;
  scope_group_display: string;
  don_country_report_scope: string;
  focal_scope_needs_review: BooleanLike;
  manual_focal_review_decision: string | null;
  manual_focal_review_note: string | null;
  disease_refinement_source: string;
  disease_refinement_needs_review: BooleanLike;
  influenza_subtype_candidates: string | null;
  influenza_subtype_evidence_span: string | null;
  was_adjudicated: boolean | null;
  adj_changed_role: boolean | null;
  adj_changed_flag: boolean | null;
  adj_changed_conf: boolean | null;
}

export interface DiseaseMeta {
  disease: string;
  n: number;
}

export interface DiseaseGroupMeta {
  disease_group: string;
  disease_group_display: string;
  n: number;
}

export interface ScopeGroupMeta {
  scope_group: string;
  scope_group_display: string;
  n: number;
}

export interface ScopeCountMeta {
  don_country_report_scope: string;
  scope_display: string;
  scope_group: string;
  scope_group_display: string;
  n: number;
}

export interface CountryMeta {
  country: string;
  iso3: string | null;
  n: number;
}

export interface Meta {
  generated_at: string;
  n_rows_total: number;
  n_rows_strict: number;
  n_rows_event: number;
  n_don_records: number;
  n_don_records_strict: number;
  n_diseases: number;
  n_diseases_strict: number;
  n_countries: number;
  n_countries_strict: number;
  date_min: string;
  date_max: string;
  data_source: string;
  audit_source?: string;
  strict_analysis_source?: string;
  generic_disease_labels: string[];
  diseases: DiseaseMeta[];
  strict_diseases?: DiseaseMeta[];
  disease_groups: DiseaseGroupMeta[];
  strict_disease_groups?: DiseaseGroupMeta[];
  scope_counts: ScopeCountMeta[];
  scope_groups: ScopeGroupMeta[];
  countries: CountryMeta[];
  strict_countries?: CountryMeta[];
}

export interface DataBundle {
  rows: Row[];
  meta: Meta;
}
