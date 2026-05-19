import { useQuery } from "@tanstack/react-query";

export const AGENT_URL = "http://127.0.0.1:3334";

async function checkAgentHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${AGENT_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export function useAgentStatus() {
  const { data: available = false } = useQuery({
    queryKey: ["agent-status"],
    queryFn: checkAgentHealth,
    refetchInterval: 10_000,
    retry: false,
    staleTime: 8_000,
  });
  return available;
}
