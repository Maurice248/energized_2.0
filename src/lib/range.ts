export type Range = "7d" | "30d" | "90d" | "qtd" | "all";

export const RANGES: Range[] = ["7d", "30d", "90d", "qtd", "all"];

export function rangeToCutoff(range: Range): Date | null {
  if (range === "all") return null;
  if (range === "qtd") {
    const now = new Date();
    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function rangeLabel(range: Range): string {
  switch (range) {
    case "7d": return "Last 7 days";
    case "30d": return "Last 30 days";
    case "90d": return "Last 90 days";
    case "qtd": return "Quarter to date";
    case "all": return "All time";
  }
}

export function isRange(value: unknown): value is Range {
  return (
    value === "7d" ||
    value === "30d" ||
    value === "90d" ||
    value === "qtd" ||
    value === "all"
  );
}
