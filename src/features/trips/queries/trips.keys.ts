export const tripsKeys = {
  all: ["trips"] as const,
  list: (search?: string) => ["trips", "list", search ?? ""] as const,
};
