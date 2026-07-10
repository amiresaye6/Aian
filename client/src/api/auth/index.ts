import api from "../axios";
import { 
   User,
   SignInCredentials,
   RegisterCredentials, 
   ChangePasswordData, 
   AuthResponse, 
   RefreshResponse 
  } from "@/types/user_and_auth"; 


export const authApi = {
  register: async (credentials: RegisterCredentials): Promise<{ user: User }> => {
    const response = await api.post("/auth/register", credentials);
    return response.data;
  },

  login: async (credentials: SignInCredentials): Promise<AuthResponse> => {
    const response = await api.post("/auth/signIn", credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  refresh: async (userId: string, refreshToken: string): Promise<RefreshResponse> => {
    const response = await api.post("/auth/refresh", { userId, refreshToken });
    return response.data;
  },

  changePassword: async (data: ChangePasswordData) => {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  verifyOtp: async (email: string, otp: string) => {
    const response = await api.post("/auth/verify-otp", { email, otp });
    return response.data;
  },

  resetPassword: async (data: any) => {
    const response = await api.post("/auth/reset-password", data);
    return response.data;
  }
};