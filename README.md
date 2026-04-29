# DON Explorer

Static React explorer for WHO Disease Outbreak News event-evidence records.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Data source

- App reads static artifacts from `public/data/`:
  - `who_don_web.json`
  - `who_don_meta.json`
- Data is generated upstream by the `new_global_maxent` pipeline.
  - Current export source: `who_don_country_disease_event_focal_scope_evidence_final.csv`
- Public attribution wording: "Based on/extracted from World Health Organization Disease Outbreak News reports. Product/app/website. Not affiliated with or endorsed by WHO."
- Row-level source links should point users back to the original WHO DON article via `article_url`.
- The app header includes an app-side "About data" panel with source attribution, independent-pipeline wording, and a reminder that derived fields are not WHO classifications or endorsements.

## Notes

- Default view shows the focal/strict scope (`scope_group === "focal"`); broader DON scope layers can be included from the Scope filter.
- Row counts represent DON event-evidence records, not epidemiological case counts.
- Kosovo, Micronesia, and Palestine use explicit ISO3 values (`XKX`, `FSM`, `PSE`) in the refreshed export.
