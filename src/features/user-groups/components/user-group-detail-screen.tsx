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
import { EntityDetailLoadingSkeleton } from "@/shared/components/entity";
import {
  SettingsDetailList,
  SettingsDetailRow,
  SettingsDetailTextValue,
  SettingsDetailTimestampValue,
  settingsDetailUserLabel,
} from "@/shared/components/settings/settings-detail-view";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { detailRecordSurfaceShellClassName } from "@/shared/components/layout/detail-metric-card";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useEntityDetailBack } from "@/shared/hooks/use-entity-detail-back";
import { buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { routes } from "@/shared/config/routes";
import { AppButton, ConfirmDialog, EditButton, SurfaceShell } from "@/shared/ui";

export function UserGroupDetailScreen({ groupId }: { groupId: number }) {
  const t = useTranslations("Dashboard.userGroups");
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
        {loading ? (
          <EntityDetailLoadingSkeleton />
        ) : error ? (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : detail ? (
          <div className="p-4 sm:p-6">
            <SettingsDetailList>
              <SettingsDetailRow label={t("fields.name")}>
                <SettingsDetailTextValue>{formatUserGroupLabel(detail)}</SettingsDetailTextValue>
              </SettingsDetailRow>
              <SettingsDetailRow label={t("fields.users")}>
                {detail.users.length === 0 ? (
                  <SettingsDetailTextValue muted>{t("table.noMembers")}</SettingsDetailTextValue>
                ) : (
                  <ul className="space-y-1">
                    {detail.users.map((user) => (
                      <li key={user.id} className="text-sm">
                        {formatUserGroupMemberLabel(user)}
                        {user.email ? (
                          <span className="ml-1 text-xs font-normal text-slate-500">({user.email})</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </SettingsDetailRow>
              <SettingsDetailRow label={t("detail.createdAt")}>
                <SettingsDetailTimestampValue
                  dateFmt={dateFmt}
                  value={detail.created_at}
                  byUser={settingsDetailUserLabel(detail.created_by)}
                  byUserTemplate={
                    settingsDetailUserLabel(detail.created_by) !== "—"
                      ? t("detail.byUser", { user: settingsDetailUserLabel(detail.created_by) })
                      : null
                  }
                />
              </SettingsDetailRow>
            </SettingsDetailList>
          </div>
        ) : null}
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
