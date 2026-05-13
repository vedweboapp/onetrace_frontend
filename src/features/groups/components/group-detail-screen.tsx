"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { deleteGroup, fetchGroup } from "@/features/groups/api/group.api";
import { GroupDetailBody } from "@/features/groups/components/group-detail-body";
import type { Group } from "@/features/groups/types/group.types";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { detailRecordSurfaceShellClassName } from "@/shared/components/layout/detail-metric-card";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { AppButton, ConfirmDialog, SurfaceShell } from "@/shared/ui";

type Props = {
  groupId: number;
};

export function GroupDetailScreen({ groupId }: Props) {
  const t = useTranslations("Dashboard.groups");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "groups");

  const [detail, setDetail] = React.useState<Group | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

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
        const row = await fetchGroup(groupId);
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
  }, [groupId, refreshNonce, t]);

  async function confirmDelete() {
    if (!detail) return;
    setDeleting(true);
    try {
      await deleteGroup(detail.id);
      toastSuccess(t("deletedToast"));
      router.push(routes.dashboard.groups);
    } catch {
      toastError(t("loadError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="pb-8 sm:pb-10">
      <DetailPageHeader
        title={detail?.name ?? (loading ? t("detail.loadingTitle") : t("detailMetaTitle"))}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        actions={
          !loading && !error && detail ? (
            <div className="flex flex-wrap gap-2">
              <AppButton type="button" variant="secondary" size="sm" onClick={() => setDeleteOpen(true)}>
                {t("delete")}
              </AppButton>
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => router.push(`${pathname}/edit?back=${encodeURIComponent(safeBack ?? routes.dashboard.groups)}`)}
                className="gap-2"
              >
                <Pencil className="size-4" strokeWidth={2} aria-hidden />
                {t("edit")}
              </AppButton>
            </div>
          ) : null
        }
      />

      <SurfaceShell className={detailRecordSurfaceShellClassName}>
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : error ? (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <AppButton type="button" variant="secondary" size="sm" onClick={() => setRefreshNonce((k) => k + 1)}>
              {t("detail.retry")}
            </AppButton>
          </div>
        ) : detail ? (
          <GroupDetailBody detail={detail} dateFmt={dateFmt} />
        ) : null}
      </SurfaceShell>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={detail?.name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
