import {
  type CountryMeta,
  type DataBundle,
  type DiseaseGroupMeta,
  type DiseaseMeta,
  type Meta,
  type Row,
  type ScopeCountMeta,
  type ScopeGroupMeta,
} from "@/types";

const ROWS_URL = "/data/who_don_web.json";
const META_URL = "/data/who_don_meta.json";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

function assignRowKeys(rows: Row[]): Row[] {
  return rows.map((row, index) => ({
    ...row,
    row_key: `${row.record_key}__${index}`,
  }));
}

function buildDiseaseMeta(rows: Row[]): DiseaseMeta[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.disease, (counts.get(row.disease) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([disease, n]) => ({ disease, n }))
    .sort((a, b) => b.n - a.n || a.disease.localeCompare(b.disease));
}

function buildCountryMeta(rows: Row[]): CountryMeta[] {
  const counts = new Map<string, CountryMeta>();

  for (const row of rows) {
    const current = counts.get(row.country);
    if (current) {
      current.n += 1;
    } else {
      counts.set(row.country, { country: row.country, iso3: row.iso3, n: 1 });
    }
  }

  return [...counts.values()].sort((a, b) => b.n - a.n || a.country.localeCompare(b.country));
}

function buildDiseaseGroupMeta(rows: Row[]): DiseaseGroupMeta[] {
  const counts = new Map<string, DiseaseGroupMeta>();

  for (const row of rows) {
    if (!row.disease_group) {
      continue;
    }

    const current = counts.get(row.disease_group);
    if (current) {
      current.n += 1;
    } else {
      counts.set(row.disease_group, {
        disease_group: row.disease_group,
        disease_group_display: row.disease_group_display ?? row.disease_group,
        n: 1,
      });
    }
  }

  return [...counts.values()].sort((a, b) => b.n - a.n || a.disease_group.localeCompare(b.disease_group));
}

function buildScopeGroupMeta(rows: Row[]): ScopeGroupMeta[] {
  const counts = new Map<string, ScopeGroupMeta>();

  for (const row of rows) {
    const current = counts.get(row.scope_group);
    if (current) {
      current.n += 1;
    } else {
      counts.set(row.scope_group, {
        scope_group: row.scope_group,
        scope_group_display: row.scope_group_display,
        n: 1,
      });
    }
  }

  return [...counts.values()].sort((a, b) => b.n - a.n || a.scope_group.localeCompare(b.scope_group));
}

function buildScopeCountMeta(rows: Row[]): ScopeCountMeta[] {
  const counts = new Map<string, ScopeCountMeta>();

  for (const row of rows) {
    const current = counts.get(row.don_country_report_scope);
    if (current) {
      current.n += 1;
    } else {
      counts.set(row.don_country_report_scope, {
        don_country_report_scope: row.don_country_report_scope,
        scope_display: row.scope_display,
        scope_group: row.scope_group,
        scope_group_display: row.scope_group_display,
        n: 1,
      });
    }
  }

  return [...counts.values()].sort((a, b) => b.n - a.n || a.scope_display.localeCompare(b.scope_display));
}

function deriveMeta(rows: Row[], meta: Meta): Meta {
  const eventCount = rows.reduce((count, row) => count + (row.event_country ? 1 : 0), 0);

  const diseases = meta.diseases.length > 0 ? meta.diseases : buildDiseaseMeta(rows);
  const diseaseGroups = meta.disease_groups.length > 0 ? meta.disease_groups : buildDiseaseGroupMeta(rows);
  const scopeGroups = meta.scope_groups?.length > 0 ? meta.scope_groups : buildScopeGroupMeta(rows);
  const scopeCounts = meta.scope_counts?.length > 0 ? meta.scope_counts : buildScopeCountMeta(rows);
  const countries = meta.countries.length > 0 ? meta.countries : buildCountryMeta(rows);

  return {
    ...meta,
    n_rows_total: rows.length,
    n_rows_event: meta.n_rows_event > 0 ? meta.n_rows_event : eventCount,
    n_diseases: diseases.length,
    n_countries: countries.length,
    diseases,
    disease_groups: diseaseGroups,
    scope_counts: scopeCounts,
    scope_groups: scopeGroups,
    countries,
  };
}

export async function loadData(): Promise<DataBundle> {
  const [rows, meta] = await Promise.all([fetchJson<Row[]>(ROWS_URL), fetchJson<Meta>(META_URL)]);
  const keyedRows = assignRowKeys(rows);

  return {
    rows: keyedRows,
    meta: deriveMeta(keyedRows, meta),
  };
}
