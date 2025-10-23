import axios from "axios";

// const BASE_URL = "http://127.0.0.1:5000";
//const BASE_URL = "https://equipped-known-bison.ngrok-free.app";

// const api = axios.create({
//   baseURL: BASE_URL,
//   timeout: 50000,
// });

// Use relative path; Nginx will forward /api requests to backend
const BASE_URL = "/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 50000,
});

// Flag to avoid multiple refresh calls at once
let isRefreshing = false;
let refreshSubscribers = [];

// Helper to subscribe requests while refreshing
function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

// Call all subscribers once refresh is done
function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If unauthorized and we haven't retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        const refreshToken = localStorage.getItem("refresh_token");

        if (!refreshToken) {
          isRefreshing = false;
          return Promise.reject(error);
        }

        try {
          const res = await axios.post(`${BASE_URL}/api/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }
          });

          const newAccessToken = res.data.access_token;
          localStorage.setItem("access_token", newAccessToken);

          isRefreshing = false;
          onRefreshed(newAccessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          isRefreshing = false;
          return Promise.reject(refreshErr);
        }
      }

      // If already refreshing, queue the request
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
