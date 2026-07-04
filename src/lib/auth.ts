import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type UserRole = "user" | "admin";

type AuthUser = {
  username: string;
  role: UserRole;
};

type AuthState = {
  currentUser: AuthUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

const AUTH_USERS: Array<AuthUser & { password: string }> = [
  { username: "user1", password: "userpass", role: "admin" },
  { username: "admin", password: "adminpass", role: "admin" },
];

const safeLocalStorage = {
  getItem: (key: string) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors.
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }
  },
};

const AUTH_STORAGE_KEY = "yaara-auth";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      isAdmin: false,
      login: (username, password) => {
        const candidate = AUTH_USERS.find(
          (user) => user.username === username && user.password === password,
        );
        if (!candidate) return false;

        set({
          currentUser: { username: candidate.username, role: candidate.role },
          isAuthenticated: true,
          isAdmin: candidate.role === "admin",
        });
        return true;
      },
      logout: () => {
        set({ currentUser: null, isAuthenticated: false, isAdmin: false });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    },
  ),
);

export type { AuthUser, UserRole };
