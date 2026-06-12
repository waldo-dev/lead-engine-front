import axios from "axios";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5008").replace(/\/$/, "");

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const url = config.url ?? "";
  const isScrapingRun = url.includes("/scraping/run") && config.method?.toLowerCase() === "post";

  if (isScrapingRun && config.headers?.["X-Scraping-User-Confirmed"] !== "true") {
    return Promise.reject(
      new Error("POST /scraping/run bloqueado: requiere confirmación explícita del usuario."),
    );
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (
      payload &&
      typeof payload === "object" &&
      payload.ok === true &&
      "data" in payload
    ) {
      response.data = payload.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const hadToken = !!localStorage.getItem("token");
      localStorage.removeItem("token");
      localStorage.removeItem("auth-storage");

      const path = window.location.pathname;
      const isAuthPage = path.startsWith("/login") || path.startsWith("/register");

      if (hadToken && !isAuthPage) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
