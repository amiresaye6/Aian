import axios from "axios";
import { useAuthStore } from "./../store/auth/auth.store";
import { authApi } from "@/api/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1234/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { user, refreshToken, logout, setTokens } = useAuthStore.getState();

      if (user?.id && refreshToken) {
        try {
          const response:any= await authApi.refresh(user.id, refreshToken);
          console.log("Refresh response from axios:", response); // Log the response data
          const { access_token, refresh_token } = response.data;
          console.log("New access token:", access_token);
          setTokens(access_token, refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          logout();
          return Promise.reject(refreshError);
        }
      } else {
        logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
