const ACCESS_KEY = "advokat_admin_access";
const REFRESH_KEY = "advokat_admin_refresh";

export const getAccessToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
};

export const getRefreshToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
};

export const clearTokens = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};
