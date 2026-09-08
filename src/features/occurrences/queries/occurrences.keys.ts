import type { BoardFilters } from "../../../domain/occurrences";

export const occurrencesKeys = {
  all: ["occurrences"] as const,
  byDate: (date: string) => ["occurrences", "date", date] as const,
  board: (filters: BoardFilters) => ["occurrences", "board", filters] as const,
  history: (id: string) => ["occurrences", "history", id] as const,
};
