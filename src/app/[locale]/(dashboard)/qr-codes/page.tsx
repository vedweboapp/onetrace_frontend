import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { QrCodesPanel } from "@/features/qr-codes/components/qr-codes-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.qrCodes");
  return { title: t("metaTitle") };
}

export default async function DashboardQrCodesPage() {
  return (
    <div className="pb-12">
      <Suspense
        fallback={
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        }
      >
        <QrCodesPanel />
      </Suspense>
    </div>
  );
}
