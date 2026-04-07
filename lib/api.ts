import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

export const apiOrigin = new URL(apiBaseUrl).origin;

async function request(path: string, options: RequestInit = {}, withAuth = true): Promise<Response> {
  const execute = async () => {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (withAuth) {
      const token = getAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    return fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers
    });
  };

  let res = await execute();
  if (res.status === 401 && withAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await execute();
    }
  }

  return res;
}

async function call<T>(path: string, options: RequestInit = {}, withAuth = true): Promise<T> {
  const res = await request(path, options, withAuth);

  if (!res.ok) {
    const message = await safeErrorMessage(res);
    throw new Error(message || `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

async function safeErrorMessage(res: Response): Promise<string | null> {
  try {
    const data = (await res.json()) as { message?: string };
    return data.message ?? null;
  } catch {
    return null;
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await call<{ accessToken: string; refreshToken: string }>(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken })
      },
      false
    );
    setTokens(res.accessToken, res.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export const api = {
  get: <T>(path: string) => call<T>(path),
  post: <T>(path: string, body: unknown) =>
    call<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    call<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    call<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => call<T>(path, { method: "DELETE" }),
  getBlob: async (path: string) => {
    const res = await request(path);
    if (!res.ok) {
      const message = await safeErrorMessage(res);
      throw new Error(message || `Request failed: ${res.status}`);
    }
    return res.blob();
  },
  raw: call
};
