export const locaisKeys = {
  all: ["locais"] as const,
  search: (term: string) => [...locaisKeys.all, "search", term] as const,
};
