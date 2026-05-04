import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/features/auth/api/types";

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  organizations: unknown[];
  setSession: (payload: {
    accessToken: string;
    user: AuthUser;
    organizations?: unknown[];
  }) => void;

  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      organizations: [],
      setSession: ({ accessToken, user, organizations }) =>
        set({
          accessToken,
          user,
          organizations: organizations ?? [],
        }),
      setAccessToken: (token) => set({ accessToken: token }),
      clearAuth: () =>
        set({ accessToken: null, user: null, organizations: [] }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        organizations: state.organizations,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AuthState> | undefined;
        return {
          ...current,
          ...p,
          accessToken: p?.accessToken ?? current.accessToken,
          user: p?.user ?? current.user,
          organizations: p?.organizations ?? current.organizations,
        };
      },
    },
  ),
);
