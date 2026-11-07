import { getErrorStatus } from "@/lib/errors";
import axios from "axios";
import { API_URL } from "@/constants/config";
import { removeTokenServer } from "@/actions/removeToken";
import { getToken } from "./getToken";

let cachedToken: string | null = null;
let isTokenHydrated = false;
let hydrationPromise: Promise<string | null> | null = null;

const api = axios.create({
  baseURL: API_URL, // Assuming backend base url, e.g. http://localhost:3001
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Cookie-authenticated requests to Next.js route handlers stay on the frontend origin.
export const frontendApi = axios.create({
  baseURL: "/",
  timeout: 10000,
  withCredentials: true,
});

export function setClientToken(token: string | null): void {
  cachedToken = token;
  isTokenHydrated = true;
  hydrationPromise = null;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export function clearClientToken(): void {
  setClientToken(null);
}

export function resetClientTokenCache(): void {
  cachedToken = null;
  isTokenHydrated = false;
  hydrationPromise = null;
  delete api.defaults.headers.common["Authorization"];
}

export async function getClientToken(): Promise<string | null> {
  if (isTokenHydrated) {
    return cachedToken;
  }
  if (hydrationPromise) {
    return hydrationPromise;
  }
  hydrationPromise = (async () => {
    try {
      const token = await getToken();
      const resolved = token ?? null;
      setClientToken(resolved);
      return resolved;
    } catch {
      setClientToken(null);
      return null;
    }
  })();
  return hydrationPromise;
}

export async function hydrateClientToken(): Promise<string | null> {
  resetClientTokenCache();
  return getClientToken();
}

api.interceptors.request.use(
  async (config) => {
    const token = await getClientToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (getErrorStatus(error) === 401) {
      clearClientToken();
      if (typeof window !== "undefined") {
        try {
          await removeTokenServer();
        } catch (e) {
          console.error("Error removing token on 401:", e);
        }

        window.location.href = `/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
