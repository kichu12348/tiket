import axios from "axios";
import { API_URL } from "@/constants/config";
import { removeToken } from "@/hooks/useToken";
import { getToken } from "./getToken";

const api = axios.create({
  baseURL: API_URL, // Assuming backend base url, e.g. http://localhost:3001
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let token: string | undefined = undefined;

api.interceptors.request.use(
  async (config) => {
    // Only access localStorage if in browser environment
    if (typeof window !== "undefined") {
      if (!token) {
        token = await getToken();
      }
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        await removeToken();
        token = undefined;
        window.location.href = "/signin";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
