export type Range = "7d" | "30d" | "90d" | "all";

export const RANGES: Range[] = ["7d", "30d", "90d", "all"];

export function rangeToCutoff(range: Range): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function rangeLabel(range: Range): string {
  switch (range) {
    case "7d": return "Last 7 days";
    case "30d": return "Last 30 days";
    case "90d": return "Last 90 days";
    case "all": return "All time";
  }
}

export function isRange(value: unknown): value is Range {
  return value === "7d" || value === "30d" || value === "90d" || value === "all";
}
