import { create } from "zustand";
import { User } from "@/types/user_and_auth";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
  setIsLoading: (isLoading) => set({ isLoading }),
  login: (user, accessToken, refreshToken) => {
    set({ user, accessToken, refreshToken, isAuthenticated: true })
    console.log("User logged in:", user);
    //console.log("Access Token:", accessToken);
    //console.log("Refresh Token:", refreshToken);  
  },
  logout: () => 
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
}));