export const driversKeys = {
  all: ["drivers"] as const,
  search: (term: string) => ["drivers", "search", term] as const,
  stats: (id: string) => ["drivers", "stats", id] as const,
};
