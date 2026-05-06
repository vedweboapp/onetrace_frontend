"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteItem, fetchItem } from "@/features/items/api/item.api";
import { ItemDetailBody } from "@/features/items/components/item-detail-body";
import { ItemFormModal } from "@/features/items/components/item-form-modal";
import type { Item } from "@/features/items/types/item.types";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, ConfirmDialog, SurfaceShell } from "@/shared/ui";

type Props = {
  itemId: number;
};

export function ItemDetailScreen({ itemId }: Props) {
  const t = useTranslations("Dashboard.items");
  const locale = useLocale();
  const router = useRouter();

  const [detail, setDetail] = React.useState<Item | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [formOpen, setFormOpen] = React.useState(false);
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
        const row = await fetchItem(itemId);
        if (!cancelled) setDetail(row);
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId, refreshNonce, t]);

  async function confirmDelete() {
    if (!detail) return;
    setDeleting(true);
    try {
      await deleteItem(detail.id);
      toastSuccess(t("deletedToast"));
      router.push(routes.dashboard.items);
    } catch {
      toastError(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="pb-12">
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {detail?.name ?? (loading ? t("detail.loadingTitle") : t("detailMetaTitle"))}
        </h1>
        {!loading && !error && detail ? (
          <div className="flex gap-2">
            <AppButton type="button" variant="secondary" size="md" onClick={() => setDeleteOpen(true)}>
              {t("delete")}
            </AppButton>
            <AppButton type="button" variant="primary" size="md" onClick={() => setFormOpen(true)}>
              {t("edit")}
            </AppButton>
          </div>
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
          <ItemDetailBody detail={detail} dateFmt={dateFmt} />
        ) : null}
      </SurfaceShell>

      <ItemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode="edit"
        item={detail}
        onSaved={() => setRefreshNonce((n) => n + 1)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={detail?.name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
