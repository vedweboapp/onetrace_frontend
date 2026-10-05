"use client";

import { useAuthStore } from "@/features/auth/store/auth.store";

/** Stable localStorage key for tab order, scoped per user. */
export function useTabOrderStorageKey(scope: string): string {
  const userId = useAuthStore((s) => s.user?.id);
  return `ot.ui.tabOrder.${scope}.${userId ?? "anon"}`;
}
