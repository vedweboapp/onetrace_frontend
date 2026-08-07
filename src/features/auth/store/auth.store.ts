import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthOrganizationMembership, AuthUser } from "../types/auth.types";

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  organizations: AuthOrganizationMembership[];
  setSession: (payload: {
    accessToken: string;
    user: AuthUser;
    organizations?: AuthOrganizationMembership[];
  }) => void;
  /** Merge profile fields (name, role) into the signed-in user without resetting the session. */
  patchUser: (partial: Partial<AuthUser>) => void;
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
      patchUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),
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
