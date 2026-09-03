"use client";

import { QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardEmptyState } from "@/shared/ui/dashboard-empty-state";

export function PublicQrCodeScreen() {
  const t = useTranslations("Public.qrCode");

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-10">
        <div className="flex h-14 items-center gap-3">
          <div className="shrink-0 rounded border border-slate-700 bg-black px-2.5 py-1.5">
            <span className="text-base font-bold leading-none tracking-tight text-slate-400">
              RED<span className="text-white">5</span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-black">{t("title")}</p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <DashboardEmptyState
          icon={QrCode}
          title={t("noDataTitle")}
          description={t("noDataDescription")}
        />
      </main>
    </div>
  );
}
