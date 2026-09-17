import { create } from "zustand";
import { persist } from "zustand/middleware";
import { reorderArray } from "@/shared/utils/reorder-array.util";

/** Stable ids for main dashboard sidebar entries (nested groups count as one). */
export const MAIN_NAV_DEFAULT_ORDER = [
  "home",
  "clients",
  "vendors",
  "contacts",
  "sites",
  "quotations",
  "invoices",
  "purchaseOrders",
  "jobs",
  "scheduling",
  "attendance",
  "qrCodes",
  "forms",
  "projects",
  "groups",
  "materialRequests",
  "dispatches",
  "returnToStock",
  "products",
] as const;

export const SETTINGS_NAV_DEFAULT_ORDER = [
  "personalProfile",
  "companySettings",
  "modules",
  "projectForms",
  "customization",
  "users",
  "roles",
  "profiles",
  "integrations",
  "auditLogs",
] as const;

export type MainNavId = (typeof MAIN_NAV_DEFAULT_ORDER)[number];
export type SettingsNavId = (typeof SETTINGS_NAV_DEFAULT_ORDER)[number];

function mergeOrder(saved: string[] | undefined, defaults: readonly string[]): string[] {
  const known = new Set(defaults);
  const next: string[] = [];
  const seen = new Set<string>();
  for (const id of saved ?? []) {
    if (!known.has(id) || seen.has(id)) continue;
    next.push(id);
    seen.add(id);
  }
  for (const id of defaults) {
    if (seen.has(id)) continue;
    next.push(id);
    seen.add(id);
  }
  return next;
}

type State = {
  mainByUser: Record<string, string[]>;
  settingsByUser: Record<string, string[]>;
  resolveMainOrder: (userKey: string) => string[];
  resolveSettingsOrder: (userKey: string) => string[];
  reorderMain: (userKey: string, fromIndex: number, toIndex: number) => void;
  reorderSettings: (userKey: string, fromIndex: number, toIndex: number) => void;
};

export const useDashboardNavOrderStore = create<State>()(
  persist(
    (set, get) => ({
      mainByUser: {},
      settingsByUser: {},
      resolveMainOrder: (userKey) =>
        mergeOrder(get().mainByUser[userKey], MAIN_NAV_DEFAULT_ORDER),
      resolveSettingsOrder: (userKey) =>
        mergeOrder(get().settingsByUser[userKey], SETTINGS_NAV_DEFAULT_ORDER),
      reorderMain: (userKey, fromIndex, toIndex) => {
        const current = mergeOrder(get().mainByUser[userKey], MAIN_NAV_DEFAULT_ORDER);
        const next = reorderArray(current, fromIndex, toIndex);
        if (next === current || next.every((id, i) => id === current[i])) return;
        set((s) => ({
          mainByUser: { ...s.mainByUser, [userKey]: next },
        }));
      },
      reorderSettings: (userKey, fromIndex, toIndex) => {
        const current = mergeOrder(get().settingsByUser[userKey], SETTINGS_NAV_DEFAULT_ORDER);
        const next = reorderArray(current, fromIndex, toIndex);
        if (next === current || next.every((id, i) => id === current[i])) return;
        set((s) => ({
          settingsByUser: { ...s.settingsByUser, [userKey]: next },
        }));
      },
    }),
    {
      name: "dashboard-nav-order",
      partialize: (s) => ({
        mainByUser: s.mainByUser,
        settingsByUser: s.settingsByUser,
      }),
    },
  ),
);

export function dashboardNavUserKey(userId: number | null | undefined): string {
  return userId != null && Number.isFinite(userId) ? `u:${userId}` : "anonymous";
}
