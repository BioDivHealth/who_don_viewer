import dayjs from "dayjs";

import { type Row } from "@/types";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(value: string): string {
  return dayjs(value).format("YYYY-MM-DD");
}

export function formatMonth(value: string): string {
  return dayjs(value).format("MMM YYYY");
}

export function getDiseaseLabel(row: Row): string {
  return row.disease_display || row.disease;
}

export function formatCodeLabel(value: string): string {
  if (value === "manual_override_high") {
    return "High";
  }

  if (value === "manual_override_keep_non_strict") {
    return "Keep non-strict";
  }

  if (value === "not_applicable") {
    return "Not applicable";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
