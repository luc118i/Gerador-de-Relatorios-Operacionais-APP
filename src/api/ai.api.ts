import { request } from "./http";

export const aiApi = {
  summarize: (text: string, title?: string): Promise<{ summary: string }> =>
    request({
      method: "POST",
      path: "/ai/summarize",
      body: { text, title },
    }),

  correct: (html: string, plainText?: string): Promise<{ corrected: string; errorCount: number }> =>
    request({
      method: "POST",
      path: "/ai/correct",
      body: { html, plainText },
    }),
};
