import { request } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL as string;

export type CentralCover = {
  url: string | null;
  updatedAt: string | null;
  /** enquadramento vertical (object-position Y, %) */
  posY: number;
  /** opacidade da imagem no quadro (0–1) */
  opacity: number;
  /** zoom: 1 = preenche a faixa, 0 = imagem inteira */
  zoom: number;
};

export const centralSettingsApi = {
  getCover() {
    return request<{ data: CentralCover }>({
      method: "GET",
      path: "/central/cover",
    }).then((r) => r.data);
  },

  async setCover(file: Blob, actorNome?: string): Promise<CentralCover> {
    const form = new FormData();
    form.append("file", file, "cover.jpg");
    if (actorNome) form.append("actorNome", actorNome);
    const res = await fetch(`${BASE_URL}/central/cover`, {
      method: "PUT",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()).data as CentralCover;
  },

  patchCover(
    patch: { posY?: number; opacity?: number; zoom?: number },
    actorNome?: string,
  ) {
    return request<{ data: CentralCover }>({
      method: "PATCH",
      path: "/central/cover",
      body: { ...patch, ...(actorNome ? { actorNome } : {}) },
    }).then((r) => r.data);
  },

  clearCover(actorNome?: string) {
    return request<{ data: CentralCover }>({
      method: "DELETE",
      path: "/central/cover",
      query: actorNome ? { actorNome } : undefined,
    }).then((r) => r.data);
  },
};
