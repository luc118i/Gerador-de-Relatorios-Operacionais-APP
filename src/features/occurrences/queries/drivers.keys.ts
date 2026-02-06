export const driversKeys = {
  all: ["drivers"] as const,
  search: (term: string) => ["drivers", "search", term] as const,
};
