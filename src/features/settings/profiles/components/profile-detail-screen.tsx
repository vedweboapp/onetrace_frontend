"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { fetchProfileDetail } from "@/features/settings/profiles/api/profile.api";
import type { Profile } from "@/features/settings/profiles/types/profile.types";
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
import { usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export function ProfileDetailScreen({ profileId }: { profileId: number }) {
  const t = useTranslations("Dashboard.profiles");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = useEntityDetailBack("settings/profiles", routes.dashboard.settingsProfiles ?? "/settings/profiles");

  const [detail, setDetail] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await fetchProfileDetail(profileId);
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
  }, [refreshNonce, t, profileId]);

  function goEdit() {
    router.push(
      buildPathWithStoredBack(
        `${pathname}/edit`,
        buildCurrentPageBackHref(pathname, searchParams),
      ),
    );
  }

  return (
    <div className="pb-8 sm:pb-10">
      <DetailPageHeader
        title={detail?.profile_name ?? t("detailMetaTitle")}
        titleLoading={loading && !detail}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={
          detail?.profile_type ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">{detail.profile_type}</span>
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
                    label={t("fields.profileName")}
                    editAriaLabel={t("fields.profileName")}
                  >
                    {detail.profile_name || "—"}
                  </DetailEditableField>

                  <DetailEditableField
                    label={t("fields.profileType")}
                    editAriaLabel={t("fields.profileType")}
                  >
                    {detail.profile_type || "—"}
                  </DetailEditableField>

                  <DetailEditableField
                    label={t("fields.description")}
                    editAriaLabel={t("fields.description")}
                    className="sm:col-span-2"
                  >
                    {detail.description || "—"}
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
