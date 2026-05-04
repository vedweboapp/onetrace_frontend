import type { DashboardAccentId } from "@/features/dashboard/store/dashboard-appearance-store";

export function accentActiveNavClass(accent: DashboardAccentId): string {
  switch (accent) {
    case "slate":
      return "bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900";
    case "indigo":
      return "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500";
    case "emerald":
      return "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500";
    case "rose":
      return "bg-rose-600 text-white shadow-sm dark:bg-rose-500";
    case "violet":
      return "bg-violet-600 text-white shadow-sm dark:bg-violet-500";
    case "amber":
      return "bg-amber-500 text-slate-900 shadow-sm dark:bg-amber-400 dark:text-slate-900";
    case "sky":
      return "bg-sky-600 text-white shadow-sm dark:bg-sky-500";
    case "fuchsia":
      return "bg-fuchsia-600 text-white shadow-sm dark:bg-fuchsia-500";
    case "teal":
      return "bg-teal-600 text-white shadow-sm dark:bg-teal-500";
    case "orange":
      return "bg-orange-600 text-white shadow-sm dark:bg-orange-500";
    default:
      return "bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900";
  }
}

export function accentHeaderStripeClass(accent: DashboardAccentId): string {
  switch (accent) {
    case "slate":
      return "bg-slate-700 dark:bg-slate-300";
    case "indigo":
      return "bg-indigo-600 dark:bg-indigo-400";
    case "emerald":
      return "bg-emerald-600 dark:bg-emerald-400";
    case "rose":
      return "bg-rose-600 dark:bg-rose-400";
    case "violet":
      return "bg-violet-600 dark:bg-violet-400";
    case "amber":
      return "bg-amber-500 dark:bg-amber-400";
    case "sky":
      return "bg-sky-600 dark:bg-sky-400";
    case "fuchsia":
      return "bg-fuchsia-600 dark:bg-fuchsia-400";
    case "teal":
      return "bg-teal-600 dark:bg-teal-400";
    case "orange":
      return "bg-orange-600 dark:bg-orange-400";
    default:
      return "bg-slate-700";
  }
}

export function accentSwatchClass(accent: DashboardAccentId): string {
  switch (accent) {
    case "slate":
      return "bg-slate-700 ring-slate-700/30";
    case "indigo":
      return "bg-indigo-600 ring-indigo-600/30";
    case "emerald":
      return "bg-emerald-600 ring-emerald-600/30";
    case "rose":
      return "bg-rose-600 ring-rose-600/30";
    case "violet":
      return "bg-violet-600 ring-violet-600/30";
    case "amber":
      return "bg-amber-500 ring-amber-500/30";
    case "sky":
      return "bg-sky-600 ring-sky-600/30";
    case "fuchsia":
      return "bg-fuchsia-600 ring-fuchsia-600/30";
    case "teal":
      return "bg-teal-600 ring-teal-600/30";
    case "orange":
      return "bg-orange-600 ring-orange-600/30";
    default:
      return "bg-slate-700 ring-slate-700/30";
  }
}
