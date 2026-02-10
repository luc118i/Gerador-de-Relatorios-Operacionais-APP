export type ApiErrorIssue = { path?: string[]; message: string };

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    issues?: ApiErrorIssue[];
  };
};

export class ApiError extends Error {
  status: number;
  code?: string;
  issues?: ApiErrorIssue[];
  raw?: unknown;

  constructor(args: {
    message: string;
    status: number;
    code?: string;
    issues?: ApiErrorIssue[];
    raw?: unknown;
  }) {
    super(args.message);
    this.status = args.status;
    this.code = args.code;
    this.issues = args.issues;
    this.raw = args.raw;
  }
}

/** Para UX (toast): issues[0].message > message > fallback */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Erro na requisição",
) {
  if (err instanceof ApiError) {
    return err.issues?.[0]?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
