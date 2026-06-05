"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { fetchDispatch } from "@/features/dispatches/api/dispatch.api";
import { DispatchLineDetailContent } from "@/features/dispatches/components/dispatch-line-detail-content";
import type { DispatchDetail, DispatchLineItem } from "@/features/dispatches/types/dispatch.types";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import { SurfaceShell } from "@/shared/ui";

type Props = {
  dispatchId: number;
  lineId: number;
};

export function DispatchLineDetailScreen({ dispatchId, lineId }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dispatchHref = React.useMemo(() => {
    const linesSuffix = `/lines/${lineId}`;
    if (pathname.endsWith(linesSuffix)) {
      return pathname.slice(0, -linesSuffix.length);
    }
    return `${routes.dashboard.dispatches}/${dispatchId}`;
  }, [pathname, dispatchId, lineId]);

  const safeBack = resolveFormBackUrl(searchParams.get("back"), "dispatches", dispatchHref);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<DispatchDetail | null>(null);
  const [line, setLine] = React.useState<DispatchLineItem | null>(null);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await fetchDispatch(dispatchId);
        if (cancelled) return;
        const match = row.lines.find((entry) => entry.id === lineId) ?? null;
        if (!match) {
          setError(t("detailLoadError"));
          setDetail(null);
          setLine(null);
          return;
        }
        setDetail(row);
        setLine(match);
      } catch {
        if (!cancelled) {
          setError(t("detailLoadError"));
          setDetail(null);
          setLine(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatchId, lineId, t]);

  function handleRestocked(updated: DispatchDetail) {
    setDetail(updated);
    const match = updated.lines.find((entry) => entry.id === lineId) ?? null;
    setLine(match);
  }

  const title = line?.item.name?.trim() || (line ? `#${line.item.id}` : t("detail.lineTitle"));

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={title}
        subtitle={detail?.dispatch_number ? t("detail.lineSubtitle", { dispatch: detail.dispatch_number }) : undefined}
        backHref={safeBack}
        backAriaLabel={t("detail.lineBackAria")}
      />

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : error || !line || !detail ? (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">{error ?? t("detailLoadError")}</p>
        ) : (
          <div className="p-4 sm:p-6">
            <DispatchLineDetailContent
              dispatchId={detail.id}
              line={line}
              dateFmt={dateFmt}
              onRestocked={handleRestocked}
            />
          </div>
        )}
      </SurfaceShell>
    </div>
  );
}
