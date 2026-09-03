import type { WorkerReturnDatePreset } from "@/features/dispatches/types/dispatch.types";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type WorkerReturnDateRange = {
  /** Inclusive lower bound; empty = no lower bound (all history). */
  date_from: string;
  /** Inclusive upper bound. */
  date_to: string;
};

export function resolveWorkerReturnDateRange(
  preset: WorkerReturnDatePreset,
  dateFrom?: string,
  dateTo?: string,
): WorkerReturnDateRange {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (preset === "till_yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { date_from: "", date_to: formatDate(y) };
  }

  if (preset === "this_week") {
    const weekStart = new Date(today);
    const day = weekStart.getDay();
    const diff = day === 0 ? 6 : day - 1;
    weekStart.setDate(weekStart.getDate() - diff);
    return { date_from: formatDate(weekStart), date_to: formatDate(today) };
  }

  if (preset === "custom") {
    const to = dateTo?.trim() || formatDate(today);
    const from = dateFrom?.trim() || "";
    return { date_from: from, date_to: to };
  }

  if (preset === "material_request") {
    return { date_from: "", date_to: "" };
  }

  // till_today — all records on or before today
  return { date_from: "", date_to: formatDate(today) };
}

export function dispatchDateInRange(
  dispatchDate: string,
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
): boolean {
  const day = dispatchDate.slice(0, 10);
  const from = dateFrom?.trim();
  const to = dateTo?.trim();
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}
