export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, "headers"> & {
  token?: string | null;
  headers?: HeadersInit;
};

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers: extraHeaders, ...fetchOptions } = options;
  const headers = new Headers(extraHeaders);
  if (
    !headers.has("Content-Type") &&
    !(fetchOptions.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`/api${path}`, {
    ...fetchOptions,
    headers,
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof result === "object" && result && "error" in result
        ? String(result.error)
        : `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status);
  }
  return result as T;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export async function downloadFile(
  path: string,
  token: string,
  fallbackName: string,
): Promise<void> {
  const response = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.error || `Download failed with status ${response.status}.`,
      response.status,
    );
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filename =
    disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
