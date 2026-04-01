import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

const CSRF_STORAGE_KEY = "csrfToken";
const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

const API = axios.create({
  baseURL,
  withCredentials: true,
});

let csrfToken =
  typeof window !== "undefined"
    ? window.sessionStorage.getItem(CSRF_STORAGE_KEY) || ""
    : "";

const setCsrfToken = (token) => {
  csrfToken = token || "";

  if (typeof window !== "undefined") {
    if (csrfToken) {
      window.sessionStorage.setItem(CSRF_STORAGE_KEY, csrfToken);
    } else {
      window.sessionStorage.removeItem(CSRF_STORAGE_KEY);
    }
  }
};

const fetchCsrfToken = async () => {
  const response = await API.get("/auth/csrf-token");
  const nextToken = response?.data?.csrfToken || "";
  setCsrfToken(nextToken);
  return nextToken;
};

const ensureCsrfToken = async () => csrfToken || fetchCsrfToken();

const isCsrfFailure = (error) => {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.msg || "").toLowerCase();

  return status === 403 && message.includes("csrf");
};

API.interceptors.request.use(async (config) => {
  const method = String(config.method || "get").toLowerCase();

  if (MUTATING_METHODS.has(method)) {
    const token = await ensureCsrfToken();
    config.headers = {
      ...(config.headers || {}),
      "x-csrf-token": token,
    };
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (
      originalRequest &&
      !originalRequest.__csrfRetried &&
      originalRequest.url !== "/auth/csrf-token" &&
      isCsrfFailure(error)
    ) {
      originalRequest.__csrfRetried = true;
      setCsrfToken("");
      const token = await fetchCsrfToken();
      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        "x-csrf-token": token,
      };

      return API.request(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default API;