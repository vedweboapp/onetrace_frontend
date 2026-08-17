"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { fetchRoleDetail } from "@/features/settings/roles/api/role.api";
import type { Role } from "@/features/settings/roles/types/role.types";
import { routes } from "@/shared/config/routes";
import { EntityDetailLoadingSkeleton } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
  detailRecordSurfaceShellClassName,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { useEntityDetailBack } from "@/shared/hooks/use-entity-detail-back";
import { AppButton, EditButton, SurfaceShell } from "@/shared/ui";
import { buildPathWithStoredBack, buildCurrentPageBackHref } from "@/shared/utils/detail-from-list.util";

export function RoleDetailScreen({ roleId }: { roleId: number }) {
  const t = useTranslations("Dashboard.roles");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = useEntityDetailBack("settings/roles", routes.dashboard.settingsRoles ?? "/settings/roles");

  const [detail, setDetail] = React.useState<Role | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await fetchRoleDetail(roleId);
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
  }, [refreshNonce, t, roleId]);

  function goEdit() {
    router.push(
      buildPathWithStoredBack(
        `${pathname}/edit`,
        buildCurrentPageBackHref(pathname, searchParams),
      ),
    );
  }

  const roleName = detail?.role_name || detail?.name || `Role #${roleId}`;

  return (
    <div className="pb-8 sm:pb-10">
      <DetailPageHeader
        title={roleName}
        titleLoading={loading && !detail}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={
          detail?.parent_role_detail ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t("fields.parentRole")}: {detail.parent_role_detail.role_name || detail.parent_role_detail.name}
            </span>
          ) : undefined
        }
        actions={
          !loading && !error && detail ? (
            <EditButton onClick={goEdit} />
          ) : null
        }
      />

      <SurfaceShell className={detailRecordSurfaceShellClassName}>
        {loading ? (
          <EntityDetailLoadingSkeleton />
        ) : error ? (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRefreshNonce((k) => k + 1)}
            >
              {t("detail.retry")}
            </AppButton>
          </div>
        ) : detail ? (
          <DetailPagePadding className="!px-0 !py-0 sm:!px-0 sm:!py-0">
            <div className={detailPageStackClassName}>
              <DetailPanelCard title={t("detail.sectionOverview")} variant="flat">
                <DetailMetricsGrid>
                  <DetailEditableField
                    label={t("fields.roleName")}
                    editAriaLabel={t("fields.roleName")}
                  >
                    {roleName}
                  </DetailEditableField>

                  <DetailEditableField
                    label={t("fields.parentRole")}
                    editAriaLabel={t("fields.parentRole")}
                  >
                    {detail.parent_role_detail
                      ? detail.parent_role_detail.role_name || detail.parent_role_detail.name || "—"
                      : "—"}
                  </DetailEditableField>

                  <DetailEditableField
                    label={t("fields.sharedDataWithPeers")}
                    editAriaLabel={t("fields.sharedDataWithPeers")}
                  >
                    {detail.shared_data_with_peers ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        No
                      </span>
                    )}
                  </DetailEditableField>

                  <DetailEditableField
                    label={t("fields.description")}
                    editAriaLabel={t("fields.description")}
                    className="sm:col-span-2"
                  >
                    {detail.description?.trim() || "—"}
                  </DetailEditableField>
                </DetailMetricsGrid>
              </DetailPanelCard>
            </div>
          </DetailPagePadding>
        ) : null}
      </SurfaceShell>
    </div>
  );
}
