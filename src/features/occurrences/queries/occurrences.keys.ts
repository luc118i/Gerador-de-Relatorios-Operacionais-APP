export const occurrencesKeys = {
  all: ["occurrences"] as const,
  byDate: (date: string) => ["occurrences", "date", date] as const,
};
