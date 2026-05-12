"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  deleteCompositeItem,
  fetchCompositeItem,
} from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { ItemDetailBody } from "@/features/items/components/item-detail-body";
import { routes } from "@/shared/config/routes";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { AppButton, ConfirmDialog, SurfaceShell } from "@/shared/ui";

type Props = {
  itemId: number;
};

export function CompositeItemDetailScreen({ itemId }: Props) {
  const t = useTranslations("Dashboard.compositeItems");
  const tItems = useTranslations("Dashboard.items");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "composite-items");

  const [detail, setDetail] = React.useState<CompositeItem | null>(null);
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
        const row = await fetchCompositeItem(itemId);
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
      await deleteCompositeItem(detail.id);
      toastSuccess(t("deletedToast"));
      router.push(routes.dashboard.compositeItems);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={detail?.name ?? (loading ? tItems("detail.loadingTitle") : tItems("detailMetaTitle"))}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={
          detail?.sku?.trim() ? (
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{detail.sku}</span>
          ) : undefined
        }
        actions={
          !loading && !error && detail ? (
            <div className="flex flex-wrap gap-2">
              <AppButton type="button" variant="secondary" size="md" onClick={() => setDeleteOpen(true)}>
                {t("delete")}
              </AppButton>
              <AppButton
                type="button"
                variant="primary"
                size="md"
                onClick={() =>
                  router.push(
                    `${pathname}/edit?back=${encodeURIComponent(safeBack ?? routes.dashboard.compositeItems)}`,
                  )
                }
                className="gap-2"
              >
                <Pencil className="size-4" strokeWidth={2} aria-hidden />
                {t("edit")}
              </AppButton>
            </div>
          ) : null
        }
      />

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
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
              {tItems("detail.retry")}
            </AppButton>
          </div>
        ) : detail ? (
          <ItemDetailBody detail={detail} dateFmt={dateFmt} />
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
