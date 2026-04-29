import { ExternalLink } from "lucide-react";

import { AdjudicationBadge } from "@/components/AdjudicationBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { formatCodeLabel, formatDate, getDiseaseLabel } from "@/lib/format";
import { type Row } from "@/types";

interface InspectorPanelProps {
  row: Row | null;
}

function highlightPhrase(text: string, phrase: string | null, markClassName: string): Array<string | JSX.Element> {
  if (!phrase || !text.includes(phrase)) {
    return [text];
  }

  const [before, after] = text.split(phrase, 2);

  return [before, <mark className={markClassName} key={phrase}>{phrase}</mark>, after];
}

function getEvidenceConfidence(row: Row): string {
  if (row.scope_group === "not_event_country") {
    return row.event_layer_confidence;
  }

  if (row.confidence === "manual_override_keep_non_strict") {
    return row.event_layer_confidence;
  }

  return row.scope_confidence;
}

function getEvidenceConfidenceLabel(row: Row): string {
  if (row.scope_group === "not_event_country") {
    return "Event-layer confidence:";
  }

  if (row.confidence === "manual_override_keep_non_strict") {
    return "Evidence confidence:";
  }

  return "Scope confidence:";
}

export function InspectorPanel({ row }: InspectorPanelProps): JSX.Element {
  if (!row) {
    return (
      <div className="flex h-full items-center justify-center border border-rule px-4 text-sm text-ink-muted">
        Select a table row to inspect provenance.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto border border-rule">
      <section className="space-y-2 border-b border-rule p-4">
        <p className="font-mono text-2xl leading-tight text-accent">
          {getDiseaseLabel(row)} in {row.country}
        </p>
        <p className="numeric text-xs text-ink-muted">{formatDate(row.date)}</p>
        <a
          className="mt-3 inline-flex w-full items-center justify-center gap-2 border border-accent bg-accent px-3 py-2 font-mono text-xs uppercase tracking-label text-paper transition-colors hover:bg-accent-hover"
          href={row.article_url}
          rel="noreferrer"
          target="_blank"
        >
          Open WHO DON article
          <ExternalLink size={14} strokeWidth={1.8} />
        </a>
      </section>

      <section className="space-y-2 border-b border-rule p-4 text-sm text-ink">
        <SectionHeader title="Classification" />
        <p>
          <span className="label">Event country:</span> {row.event_country ? "Yes" : "No"}
        </p>
        <p>
          <span className="label">Scope:</span> {row.scope_display || formatCodeLabel(row.scope)}
        </p>
        <p>
          <span className="label">{getEvidenceConfidenceLabel(row)}</span> {formatCodeLabel(getEvidenceConfidence(row))}
        </p>
        {row.manual_focal_review_decision === "keep_non_strict" ? (
          <div>
            <AdjudicationBadge label="Keep non-strict" />
          </div>
        ) : null}
        <p>
          <span className="label">Reason:</span> {formatCodeLabel(row.reasoning)}
        </p>
      </section>

      {row.scope_group === "not_event_country" ? (
        <section className="space-y-2 border-b border-rule p-4 text-sm text-ink">
          <SectionHeader title="Event layer" />
          <p>
            <span className="label">Event-layer confidence:</span> {formatCodeLabel(row.event_layer_confidence)}
          </p>
          <p>
            <span className="label">Event-layer reasoning:</span> {formatCodeLabel(row.event_layer_reasoning)}
          </p>
          <p>
            <span className="label">Needs review:</span> {row.event_layer_needs_review ? "Yes" : "No"}
          </p>
        </section>
      ) : null}

      <section className="space-y-2 border-b border-rule p-4">
        <SectionHeader title="Evidence" />
        {row.evidence_sentence ? (
          <p className="text-sm text-ink">
            {highlightPhrase(row.evidence_sentence, row.trigger_phrase, "rounded-sm bg-accent/15 px-1 text-accent")}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">No evidence sentence captured for this record.</p>
        )}
        {row.exclusion_phrase ? (
          <p className="text-sm text-ink-muted">
            Exclusion phrase: <mark className="rounded-sm bg-paper-2 px-1 text-ink">{row.exclusion_phrase}</mark>
          </p>
        ) : null}
      </section>
    </div>
  );
}
