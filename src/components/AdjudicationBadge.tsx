import { Badge } from "@/components/ui/badge";

interface AdjudicationBadgeProps {
  label: string;
}

export function AdjudicationBadge({ label }: AdjudicationBadgeProps): JSX.Element {
  return <Badge className="border-accent/40 bg-accent/10 text-accent">{label}</Badge>;
}
