export const driversKeys = {
  all: ["drivers"] as const,
  search: (term: string) => ["drivers", "search", term] as const,
  stats: (id: string) => ["drivers", "stats", id] as const,
  situation: (id: string) => ["drivers", "situation", id] as const,
  monthlyOccurrences: (id: string, months: number) =>
    ["drivers", "monthly-occurrences", id, months] as const,
  dashboard: ["drivers", "dashboard"] as const,
  occurrenceHistory: (id: string) => ["drivers", "occurrence-history", id] as const,
};
