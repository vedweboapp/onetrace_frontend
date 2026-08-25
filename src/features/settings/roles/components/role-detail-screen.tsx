"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchRoleDetail, fetchRolesList, updateRole } from "@/features/settings/roles/api/role.api";
import { mergeRoleDetailPayload } from "@/features/settings/roles/schemas/role-form-schema";
import type { Role, RolePayload } from "@/features/settings/roles/types/role.types";
import { EntityDetailEditButton, EntityDetailScreen } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";

const yesNoOptions: CheckmarkSelectOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

function RoleDetailFields({
  detail,
  onSaved,
}: {
  detail: Role;
  onSaved: () => void;
}) {
  const t = useTranslations("Dashboard.roles");
  const tActions = useTranslations("Dashboard.common.actions");
  const [parentRoleOptions, setParentRoleOptions] = React.useState<CheckmarkSelectOption[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const roles = await fetchRolesList();
        if (cancelled) return;
        setParentRoleOptions(
          roles
            .filter((row) => row.id !== detail.id)
            .map((row) => ({
              value: String(row.id),
              label: row.role_name?.trim() || row.name?.trim() || `Role #${row.id}`,
            })),
        );
      } catch {
        if (!cancelled) setParentRoleOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id]);

  const patchField = useDetailPatch(
    (patch: Partial<RolePayload>) => updateRole(detail.id, mergeRoleDetailPayload(detail, patch)),
    { success: t("updatedToast"), error: t("saveError") },
    onSaved,
  );

  const parentRoleValue = detail.parent_role != null ? String(detail.parent_role) : "";
  const sharedPeersValue = detail.shared_data_with_peers ? "true" : "false";

  return (
    <DetailPagePadding className="!px-0 !py-0 sm:!px-0 sm:!py-0">
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionOverview")} variant="flat">
          <DetailMetricsGrid>
            <DetailEditableField
              label={t("fields.roleName")}
              value={detail.role_name ?? detail.name ?? ""}
              kind="text"
              disabled
            >
              {detail.role_name || detail.name || "—"}
            </DetailEditableField>

            <DetailEditableField
              label={t("fields.parentRole")}
              value={parentRoleValue}
              kind="select"
              options={parentRoleOptions}
              selectSearchable
              editAriaLabel={tActions("edit")}
              onSave={(next) =>
                patchField({
                  parent_role: next.trim() ? Number(next) : null,
                })
              }
            >
              {(() => {
                const parentObj = detail.parent_role_details || detail.parent_role_detail;
                return parentObj ? parentObj.role_name || parentObj.name || "—" : "—";
              })()}
            </DetailEditableField>

            <DetailEditableField
              label={t("fields.sharedDataWithPeers")}
              value={sharedPeersValue}
              kind="select"
              options={yesNoOptions}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ shared_data_with_peers: next === "true" })}
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
              value={detail.description ?? ""}
              kind="text"
              multiline
              span="full"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ description: next.trim() || null })}
            >
              {detail.description?.trim() || "—"}
            </DetailEditableField>
          </DetailMetricsGrid>
        </DetailPanelCard>
      </div>
    </DetailPagePadding>
  );
}

export function RoleDetailScreen({ roleId }: { roleId: number }) {
  const t = useTranslations("Dashboard.roles");
  const listRoute = routes.dashboard.settingsRoles ?? "/settings/roles";

  return (
    <EntityDetailScreen
      entityId={roleId}
      listSection="settings/roles"
      listRoute={listRoute}
      loadError={t("detailLoadError")}
      fetch={fetchRoleDetail}
      getTitle={(detail) => detail.role_name || detail.name || t("detailMetaTitle")}
      subtitle={(detail) => {
        const parentObj = detail.parent_role_details || detail.parent_role_detail;
        return parentObj ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t("fields.parentRole")}:{" "}
            {parentObj.role_name || parentObj.name}
          </span>
        ) : undefined;
      }}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      actions={({ listBack }) => (
        <EntityDetailEditButton label={t("edit")} listBack={listBack} fallbackRoute={listRoute} />
      )}
    >
      {({ detail, retry }) => <RoleDetailFields detail={detail} onSaved={retry} />}
    </EntityDetailScreen>
  );
}
