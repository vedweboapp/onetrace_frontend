"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, History, Loader2, RefreshCw } from "lucide-react";
import {
  fetchZohoSyncHistoryPage,
  retryZohoSyncJobFailedRecords,
} from "@/features/settings/integrations/api/integration.api";
import type { ZohoSyncHistoryEntry } from "@/features/settings/integrations/types/integration.types";
import {
  canRetryZohoSyncHistory,
  formatZohoSyncDuration,
  isZohoEventLogDetails,
  isZohoSyncJobDetails,
  zohoEventPayloadSummary,
  zohoSyncHistoryResource,
  zohoSyncHistoryStatus,
  zohoSyncJobId,
  zohoSyncResourceDisplayLabel,
} from "@/features/settings/integrations/utils/zoho-sync-history.util";
import { getApiErrorDisplayMessage, toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import {
  AppButton,
  DashboardEmptyState,
  DetailPanel,
  SurfaceShell,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

const PAGE_SIZE = 25;

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3 border-b border-slate-100 py-2.5 last:border-b-0 dark:border-slate-800">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const lower = status.toLowerCase();
  const tone =
    lower.includes("success") || lower === "succeeded" || lower === "completed"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
      : lower.includes("fail") || lower.includes("error")
        ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
        : lower.includes("partial") || lower.includes("skip")
          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          : lower.includes("run") || lower.includes("progress") || lower === "queued"
            ? "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  return (
    <span className={cn("inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-semibold", tone)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function kindLabel(
  entry: ZohoSyncHistoryEntry,
  t: ReturnType<typeof useTranslations<"Dashboard.integrations.zohoSyncHistory">>,
): string {
  if (entry.details_type === "sync_job") return t("kind.syncJob");
  if (entry.details_type === "event_log") return t("kind.eventLog");
  return t("kind.other");
}

export function ZohoSyncHistoryPanel() {
  const t = useTranslations("Dashboard.integrations.zohoSyncHistory");
  const tResources = useTranslations("Dashboard.integrations.zohoResources");
  const locale = useLocale();
  const [items, setItems] = React.useState<ZohoSyncHistoryEntry[]>([]);
  const [count, setCount] = React.useState(0);
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<ZohoSyncHistoryEntry | null>(null);
  const [retryingId, setRetryingId] = React.useState<number | null>(null);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    [locale],
  );

  const load = React.useCallback(
    async (nextOffset: number) => {
      setLoading(true);
      setLoadError(null);
      try {
        const page = await fetchZohoSyncHistoryPage(PAGE_SIZE, nextOffset);
        setItems(page.items);
        setCount(page.count);
        setOffset(page.offset);
      } catch (error) {
        setItems([]);
        setCount(0);
        setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  React.useEffect(() => {
    void load(0);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  async function handleRetry(entry: ZohoSyncHistoryEntry) {
    const jobId = zohoSyncJobId(entry);
    if (jobId == null) return;
    setRetryingId(entry.id);
    try {
      const message = await retryZohoSyncJobFailedRecords(jobId);
      toastSuccess(message || t("retrySuccess"));
      void load(offset);
      setSelected(null);
    } catch (error) {
      toastApiError(error, t("retryError"));
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <>
      <SurfaceShell className="rounded-xl">
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>
            </div>
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 self-start"
              disabled={loading}
              onClick={() => void load(offset)}
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              <span className="ml-1.5">{t("refresh")}</span>
            </AppButton>
          </div>

          {loading && items.length === 0 ? (
            <div className="space-y-2 py-2">
              <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : loadError ? (
            <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : items.length === 0 ? (
            <DashboardEmptyState
              icon={History}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              compact
            />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {items.map((entry) => {
                const status = zohoSyncHistoryStatus(entry);
                const resource = zohoSyncHistoryResource(entry);
                const failed = entry.failed_record_count ?? 0;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900/60 sm:px-4"
                      onClick={() => setSelected(entry)}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {zohoSyncResourceDisplayLabel(resource, tResources, t("resourceUnknown"))}
                          </p>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {kindLabel(entry, t)}
                          </span>
                          <StatusPill status={status} />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {[
                            entry.event_type?.trim()
                              ? t("eventTypeValue", { value: entry.event_type.replace(/_/g, " ") })
                              : null,
                            formatFlexibleApiDate(entry.created_at, dateFmt) || null,
                            failed > 0 ? t("failedCount", { count: failed }) : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <ChevronRight
                        className="mt-1 size-4 shrink-0 text-slate-400"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {count > PAGE_SIZE ? (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("pageOf", { page: currentPage, total: totalPages, count })}
              </p>
              <div className="flex items-center gap-2">
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loading || offset <= 0}
                  onClick={() => void load(Math.max(0, offset - PAGE_SIZE))}
                >
                  {t("prev")}
                </AppButton>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loading || offset + PAGE_SIZE >= count}
                  onClick={() => void load(offset + PAGE_SIZE)}
                >
                  {t("next")}
                </AppButton>
              </div>
            </div>
          ) : null}
        </div>
      </SurfaceShell>

      <DetailPanel
        open={selected != null}
        onClose={() => setSelected(null)}
        title={t("detailTitle")}
        subtitle={
          selected
            ? zohoSyncResourceDisplayLabel(
                zohoSyncHistoryResource(selected),
                tResources,
                t("resourceUnknown"),
              )
            : undefined
        }
      >
        {selected ? (
          <div className="space-y-5">
            <dl className="rounded-lg border border-slate-200 px-3 dark:border-slate-800">
              <DetailRow label={t("fields.when")} value={formatFlexibleApiDate(selected.created_at, dateFmt)} />
              <DetailRow label={t("fields.kind")} value={kindLabel(selected, t)} />
              <DetailRow
                label={t("fields.resource")}
                value={zohoSyncResourceDisplayLabel(
                  zohoSyncHistoryResource(selected),
                  tResources,
                  t("resourceUnknown"),
                )}
              />
              {selected.event_type?.trim() ? (
                <DetailRow
                  label={t("fields.event")}
                  value={selected.event_type.replace(/_/g, " ")}
                />
              ) : null}
              <DetailRow label={t("fields.status")} value={<StatusPill status={zohoSyncHistoryStatus(selected)} />} />
              {(selected.failed_record_count ?? 0) > 0 ? (
                <DetailRow
                  label={t("fields.failedRecords")}
                  value={String(selected.failed_record_count)}
                />
              ) : null}
            </dl>

            {isZohoSyncJobDetails(selected) ? (
              <dl className="rounded-lg border border-slate-200 px-3 dark:border-slate-800">
                <p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("sections.counts")}
                </p>
                {selected.details.mode?.trim() ? (
                  <DetailRow label={t("fields.mode")} value={selected.details.mode} />
                ) : null}
                {selected.details.processed_count != null ? (
                  <DetailRow label={t("fields.processed")} value={String(selected.details.processed_count)} />
                ) : null}
                {selected.details.created_count != null ? (
                  <DetailRow label={t("fields.created")} value={String(selected.details.created_count)} />
                ) : null}
                {selected.details.updated_count != null ? (
                  <DetailRow label={t("fields.updated")} value={String(selected.details.updated_count)} />
                ) : null}
                {selected.details.restored_count != null && selected.details.restored_count > 0 ? (
                  <DetailRow label={t("fields.restored")} value={String(selected.details.restored_count)} />
                ) : null}
                {selected.details.skipped_count != null && selected.details.skipped_count > 0 ? (
                  <DetailRow label={t("fields.skipped")} value={String(selected.details.skipped_count)} />
                ) : null}
                {selected.details.started_at ? (
                  <DetailRow
                    label={t("fields.started")}
                    value={formatFlexibleApiDate(selected.details.started_at, dateFmt)}
                  />
                ) : null}
                {selected.details.completed_at ? (
                  <DetailRow
                    label={t("fields.completed")}
                    value={formatFlexibleApiDate(selected.details.completed_at, dateFmt)}
                  />
                ) : null}
                {formatZohoSyncDuration(selected.details.duration) ? (
                  <DetailRow
                    label={t("fields.duration")}
                    value={formatZohoSyncDuration(selected.details.duration)}
                  />
                ) : null}
                {selected.details.error?.trim() ? (
                  <DetailRow label={t("fields.error")} value={selected.details.error.trim()} />
                ) : null}
              </dl>
            ) : null}

            {isZohoEventLogDetails(selected) ? (
              <dl className="rounded-lg border border-slate-200 px-3 dark:border-slate-800">
                <p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("sections.event")}
                </p>
                {selected.details.retry_count != null && selected.details.retry_count > 0 ? (
                  <DetailRow label={t("fields.retries")} value={String(selected.details.retry_count)} />
                ) : null}
                {selected.details.error?.trim() ? (
                  <DetailRow label={t("fields.error")} value={selected.details.error.trim()} />
                ) : null}
                {zohoEventPayloadSummary(selected.details).length > 0 ? (
                  <DetailRow
                    label={t("fields.records")}
                    value={
                      <ul className="space-y-1">
                        {zohoEventPayloadSummary(selected.details).map((line) => (
                          <li key={line} className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {line}
                          </li>
                        ))}
                      </ul>
                    }
                  />
                ) : null}
              </dl>
            ) : null}

            {Array.isArray(selected.errors) && selected.errors.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("sections.errors")}
                </p>
                <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/50">
                  {selected.errors.map((err, index) => {
                    const message =
                      (typeof err.message === "string" && err.message.trim()) ||
                      (typeof err.reason === "string" && err.reason.trim()) ||
                      t("unknownError");
                    return (
                      <li
                        key={`${index}-${message}`}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        {message}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {selected.details_type === "sync_job" ? (
              <AppButton
                type="button"
                className="w-full sm:w-auto"
                loading={retryingId === selected.id}
                disabled={retryingId === selected.id || !canRetryZohoSyncHistory(selected)}
                title={
                  canRetryZohoSyncHistory(selected) ? undefined : t("retryUnavailable")
                }
                onClick={() => void handleRetry(selected)}
              >
                {t("retryFailed")}
              </AppButton>
            ) : null}
          </div>
        ) : null}
      </DetailPanel>
    </>
  );
}
