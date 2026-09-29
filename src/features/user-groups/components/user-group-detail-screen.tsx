"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { deleteUserGroup, fetchUserGroup } from "@/features/user-groups/api/user-group.api";
import type { UserGroup } from "@/features/user-groups/types/user-group.types";
import {
  formatUserGroupLabel,
  formatUserGroupMemberLabel,
} from "@/features/user-groups/utils/user-group-display.util";
import { DetailSystemMetadataSection, EntityDetailLoadingSkeleton } from "@/shared/components/entity";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import {
  DetailLinkedTable,
  DetailLinkedTableRow,
  DetailLinkedTableTd,
  detailLinkedTableCellClassName,
} from "@/shared/components/layout/detail-linked-table";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
  detailRecordInnerClassName,
  detailRecordSurfaceShellClassName,
} from "@/shared/components/layout/detail-metric-card";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useEntityDetailBack } from "@/shared/hooks/use-entity-detail-back";
import { buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { routes } from "@/shared/config/routes";
import { AppButton, ConfirmDialog, EditButton, SurfaceShell } from "@/shared/ui";

export function UserGroupDetailScreen({ groupId }: { groupId: number }) {
  const t = useTranslations("Dashboard.userGroups");
  const tMeta = useTranslations("Dashboard.common.detail");
  const dateFmt = useDashboardDateFormat();
  const router = useRouter();
  const pathname = usePathname();
  const safeBack = useEntityDetailBack("settings/user-groups", routes.dashboard.settingsUserGroups);
  const [detail, setDetail] = React.useState<UserGroup | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await fetchUserGroup(groupId);
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
  }, [groupId, t]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteUserGroup(groupId);
      toastSuccess(t("deleted"));
      router.push(safeBack);
    } catch (err) {
      toastApiError(err, t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  const title = detail ? formatUserGroupLabel(detail) : t("detailMetaTitle");
  const members = detail?.users ?? [];

  return (
    <div className="min-h-0 w-full pb-8 sm:pb-10">
      <DetailPageHeader
        title={title}
        titleLoading={loading && !detail}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        actions={
          !loading && !error && detail ? (
            <div className="flex flex-wrap gap-2">
              <EditButton
                onClick={() =>
                  router.push(buildPathWithStoredBack(`${pathname}/edit`, pathname))
                }
              >
                {t("edit")}
              </EditButton>
              <AppButton type="button" variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
                {t("delete")}
              </AppButton>
            </div>
          ) : null
        }
      />

      <SurfaceShell className={`${detailRecordSurfaceShellClassName} mt-3`}>
        <div className={detailRecordInnerClassName}>
        {loading ? (
          <EntityDetailLoadingSkeleton />
        ) : error ? (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : detail ? (
          <DetailPagePadding>
            <div className={detailPageStackClassName}>
              <DetailPanelCard title={t("detail.sectionGroup")}>
                <DetailMetricsGrid columns={2}>
                  <DetailMetricCard label={t("fields.name")}>
                    {formatUserGroupLabel(detail)}
                  </DetailMetricCard>
                  <DetailMetricCard label={t("table.members")}>
                    <span className="tabular-nums">{members.length}</span>
                  </DetailMetricCard>
                </DetailMetricsGrid>
              </DetailPanelCard>

              <DetailPanelCard title={t("detail.sectionUsers")}>
                {members.length === 0 ? (
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    {t("table.noMembers")}
                  </p>
                ) : (
                  <DetailLinkedTable
                    columns={[
                      { id: "name", header: t("detail.userName") },
                      { id: "email", header: t("detail.userEmail") },
                    ]}
                  >
                    {members.map((user, index) => {
                      const name = formatUserGroupMemberLabel(user);
                      const email = user.email?.trim() || "—";
                      return (
                        <DetailLinkedTableRow key={user.id} index={index}>
                          <DetailLinkedTableTd className={detailLinkedTableCellClassName({})}>
                            {name}
                          </DetailLinkedTableTd>
                          <DetailLinkedTableTd className={detailLinkedTableCellClassName({})}>
                            {email}
                          </DetailLinkedTableTd>
                        </DetailLinkedTableRow>
                      );
                    })}
                  </DetailLinkedTable>
                )}
              </DetailPanelCard>

              <DetailSystemMetadataSection
                createdAt={detail.created_at}
                modifiedAt={detail.modified_at ?? null}
                dateFmt={dateFmt}
                createdBy={detail.created_by ?? null}
                modifiedBy={detail.modified_by ?? null}
                labels={{
                  sectionTitle: tMeta("systemMetadata"),
                  createdAt: t("fields.createdAt"),
                  updatedAt: t("fields.updatedAt"),
                  createdBy: t("fields.createdBy"),
                  modifiedBy: tMeta("modifiedBy"),
                  notModifiedYet: tMeta("notModifiedYet"),
                }}
              />
            </div>
          </DetailPagePadding>
        ) : null}
        </div>
      </SurfaceShell>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={detail ? formatUserGroupLabel(detail) : undefined}
        confirmLabel={t("delete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
