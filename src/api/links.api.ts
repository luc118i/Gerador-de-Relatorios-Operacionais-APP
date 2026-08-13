import { request } from "./http";

export const linksApi = {
  /** Encurta um lote de URLs (TinyURL, via backend — evita CORS do TinyURL no browser). */
  async shorten(urls: string[]): Promise<Record<string, string>> {
    if (urls.length === 0) return {};
    const json = await request<{ data: Record<string, string> }>({
      method: "POST",
      path: "/links/shorten",
      body: { urls },
    });
    return json.data ?? {};
  },
};
