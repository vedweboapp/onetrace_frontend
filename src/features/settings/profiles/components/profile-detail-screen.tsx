"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchProfileDetail, updateProfile } from "@/features/settings/profiles/api/profile.api";
import { mergeProfileDetailPayload } from "@/features/settings/profiles/schemas/profile-form-schema";
import type { Profile, ProfilePayload } from "@/features/settings/profiles/types/profile.types";
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

function ProfileDetailFields({
  detail,
  onSaved,
}: {
  detail: Profile;
  onSaved: () => void;
}) {
  const t = useTranslations("Dashboard.profiles");
  const tActions = useTranslations("Dashboard.common.actions");

  const patchField = useDetailPatch(
    (patch: Partial<ProfilePayload>) =>
      updateProfile(detail.id, mergeProfileDetailPayload(detail, patch)),
    { success: t("updatedToast"), error: t("saveError") },
    onSaved,
  );

  return (
    <DetailPagePadding className="!px-0 !py-0 sm:!px-0 sm:!py-0">
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionOverview")} variant="flat">
          <DetailMetricsGrid>
            <DetailEditableField
              label={t("fields.profileName")}
              value={detail.profile_name ?? ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ profile_name: next.trim() })}
            >
              {detail.profile_name || "—"}
            </DetailEditableField>

            <DetailEditableField
              label={t("fields.profileType")}
              value={detail.profile_type ?? ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ profile_type: next.trim() || null })}
            >
              {detail.profile_type || "—"}
            </DetailEditableField>

            <DetailEditableField
              label={t("fields.description")}
              value={detail.description ?? ""}
              kind="text"
              multiline
              textareaBox
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ description: next.trim() || null })}
            />
          </DetailMetricsGrid>
        </DetailPanelCard>
      </div>
    </DetailPagePadding>
  );
}

export function ProfileDetailScreen({ profileId }: { profileId: number }) {
  const t = useTranslations("Dashboard.profiles");
  const listRoute = routes.dashboard.settingsProfiles ?? "/settings/profiles";

  return (
    <EntityDetailScreen
      entityId={profileId}
      listSection="settings/profiles"
      listRoute={listRoute}
      loadError={t("detailLoadError")}
      fetch={fetchProfileDetail}
      getTitle={(detail) => detail.profile_name || t("detailMetaTitle")}
      subtitle={(detail) =>
        detail.profile_type ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">{detail.profile_type}</span>
        ) : undefined
      }
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      actions={({ listBack }) => (
        <EntityDetailEditButton label={t("edit")} listBack={listBack} fallbackRoute={listRoute} />
      )}
    >
      {({ detail, retry }) => <ProfileDetailFields detail={detail} onSaved={retry} />}
    </EntityDetailScreen>
  );
}
