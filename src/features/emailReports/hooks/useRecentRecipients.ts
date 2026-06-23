const RECENT_KEY = 'recentRecipients';
const MAX_RECENT = 10;

export function useRecentRecipients() {
  function getRecent(): string[] {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  }

  function addRecent(emails: string[]) {
    const prev = getRecent();
    const merged = [...new Set([...emails, ...prev])].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(merged));
  }

  return { getRecent, addRecent };
}
