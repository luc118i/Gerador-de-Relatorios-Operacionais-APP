import { request } from "./http";

export type OccurrencePreset = { id: string; name: string };

export const presetsApi = {
  async getPresets(): Promise<OccurrencePreset[]> {
    const json = await request<{ data: OccurrencePreset[] }>({
      method: "GET",
      path: "/occurrence-presets",
    });
    return json.data ?? [];
  },

  async createPreset(name: string): Promise<OccurrencePreset> {
    const json = await request<{ data: OccurrencePreset }>({
      method: "POST",
      path: "/occurrence-presets",
      body: { name },
    });
    return json.data;
  },

  async deletePreset(id: string): Promise<void> {
    await request<{ ok: boolean }>({
      method: "DELETE",
      path: `/occurrence-presets/${id}`,
    });
  },
};
