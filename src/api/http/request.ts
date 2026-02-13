import { ApiError, type ApiErrorPayload } from "./errors";

const BASE_URL = import.meta.env.VITE_API_URL as string;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
};

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isApiErrorPayload(x: unknown): x is ApiErrorPayload {
  return (
    !!x &&
    typeof x === "object" &&
    "error" in x &&
    !!(x as any).error &&
    typeof (x as any).error === "object" &&
    typeof (x as any).error.code === "string" &&
    typeof (x as any).error.message === "string"
  );
}

export async function request<T>({
  method = "GET",
  path,
  query,
  body,
}: RequestOptions): Promise<T> {
  let urlString = `${BASE_URL}${path}`;
  const url = new URL(urlString);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value));
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.ok) {
    return res.json();
  }

  const text = await res.text();
  const parsed = text ? tryParseJson(text) : null;

  if (isApiErrorPayload(parsed)) {
    throw new ApiError({
      status: res.status,
      message: parsed.error.message || "Erro na requisição",
      code: parsed.error.code,
      issues: parsed.error.issues,
      raw: parsed,
    });
  }

  throw new ApiError({
    status: res.status,
    message: text || "Erro na requisição",
    raw: parsed ?? text,
  });
}
