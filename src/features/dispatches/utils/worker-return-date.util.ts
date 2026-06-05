import type { WorkerReturnDatePreset } from "@/features/dispatches/types/dispatch.types";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function resolveWorkerReturnDateRange(
  preset: WorkerReturnDatePreset,
  dateFrom?: string,
  dateTo?: string,
): { date_from: string; date_to: string } {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (preset === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const s = formatDate(y);
    return { date_from: s, date_to: s };
  }

  if (preset === "custom") {
    const from = dateFrom?.trim() || formatDate(today);
    const to = dateTo?.trim() || from;
    return { date_from: from, date_to: to };
  }

  const s = formatDate(today);
  return { date_from: s, date_to: s };
}

export function dispatchDateInRange(dispatchDate: string, dateFrom: string, dateTo: string): boolean {
  const day = dispatchDate.slice(0, 10);
  return day >= dateFrom && day <= dateTo;
}
