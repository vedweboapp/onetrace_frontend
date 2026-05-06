"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { fetchClient } from "@/features/clients/api/client.api";
import { ClientDetailBody } from "@/features/clients/components/client-detail-body";
import { ClientFormModal } from "@/features/clients/components/client-form-modal";
import type { Client } from "@/features/clients/types/client.types";
import { AppButton, SurfaceShell } from "@/shared/ui";

type Props = {
  clientId: number;
};

export function ClientDetailScreen({ clientId }: Props) {
  const t = useTranslations("Dashboard.clients");
  const locale = useLocale();

  const [detail, setDetail] = React.useState<Client | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [formOpen, setFormOpen] = React.useState(false);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const row = await fetchClient(clientId);
        if (!cancelled) setDetail(row);
      } catch {
        if (!cancelled) setError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, refreshNonce, t]);

  function openEdit() {
    if (!detail) return;
    setFormOpen(true);
  }

  function handleFormSaved() {
    setRefreshNonce((n) => n + 1);
  }

  return (
    <div className="pb-12">
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {detail?.name ?? (loading ? t("detail.loadingTitle") : t("detailMetaTitle"))}
        </h1>
        {!loading && !error && detail ? (
          <AppButton type="button" variant="primary" size="md" onClick={openEdit}>
            {t("detail.edit")}
          </AppButton>
        ) : null}
      </div>

      <SurfaceShell className="rounded-none">
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : error ? (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <AppButton type="button" variant="secondary" size="md" onClick={() => setRefreshNonce((k) => k + 1)}>
              {t("detail.retry")}
            </AppButton>
          </div>
        ) : detail ? (
          <ClientDetailBody detail={detail} dateFmt={dateFmt} />
        ) : null}
      </SurfaceShell>

      <ClientFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode="edit"
        client={detail}
        onSaved={handleFormSaved}
      />
    </div>
  );
}
