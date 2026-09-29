import type { Metadata } from "next";
import { Suspense } from "react";
import { KioskBuilder } from "@/features/kiosk/components/kiosk-builder";

export const metadata: Metadata = {
  title: "Kiosk Settings",
};

export default function SettingsKioskPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      }
    >
      <div data-full-bleed-page className="dashboard-full-bleed-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <KioskBuilder />
      </div>
    </Suspense>
  );
}
