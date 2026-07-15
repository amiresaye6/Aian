import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types/user_and_auth";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  orgId: string | null;
  isAuthenticated: boolean;
  isAuthorized: (allowedRoles: string | string[]) => boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setOrgId: (orgId: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  
};

export const useAuthStore = create<AuthState>()(
  persist(
  (set,get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  orgId: null,
  isAuthenticated: false,
  isLoading: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
  setOrgId: (orgId) => set({ orgId }),
  setIsLoading: (isLoading) => set({ isLoading }),
  isAuthorized: (allowedRoles) => {
        const { user } = get();
        if (!user) return false;
        
        if (Array.isArray(allowedRoles)) {
          return allowedRoles.includes(user.role);
        }
        return user.role === allowedRoles;
  },
  login: (user, accessToken, refreshToken) => {
    set({ user, accessToken, refreshToken, isAuthenticated: true })
    console.log("User logged in:", user);
    //console.log("Access Token:", accessToken);
    //console.log("Refresh Token:", refreshToken);  
  },
  logout: () => 
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
      }),
    {
      name: "auth-storage",
    }
  )
);
// }));