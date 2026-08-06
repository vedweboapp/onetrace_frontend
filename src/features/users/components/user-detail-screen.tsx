"use client";

import * as React from "react";
import { Mail, Phone, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchUserProfile } from "@/features/users/api/user.api";
import type { UserProfile } from "@/features/users/types/user.types";
import { routes } from "@/shared/config/routes";
import {
  detailRecordSurfaceShellClassName,
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { EntityDetailLoadingSkeleton } from "@/shared/components/entity";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { useEntityDetailBack } from "@/shared/hooks/use-entity-detail-back";
import { buildCurrentPageBackHref, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { AppButton, EditButton, SurfaceShell } from "@/shared/ui";

function userRoleLabel(row: UserProfile | null): string {
  if (!row?.role_detail) return "—";
  return (
    row.role_detail.role_name?.trim() || row.role_detail.name?.trim() || "—"
  );
}

export function UserDetailScreen({ userId }: { userId: number }) {
  const t = useTranslations("Dashboard.users");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = useEntityDetailBack("settings/users", routes.dashboard.settingsUsers);
  const [detail, setDetail] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await fetchUserProfile(userId);
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
  }, [refreshNonce, t, userId]);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  return (
    <div className="pb-8 sm:pb-10">
      <DetailPageHeader
        title={
          detail
            ? `${detail.user_detail.first_name ?? ""} ${detail.user_detail.last_name ?? ""}`.trim() ||
              detail.user_detail.email
            : t("detailMetaTitle")
        }
        titleLoading={loading && !detail}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={
          detail ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <User
                  className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500"
                  aria-hidden
                />
                {userRoleLabel(detail)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail
                  className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500"
                  aria-hidden
                />
                <a
                  href={`mailto:${detail.user_detail.email}`}
                  className="text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {detail.user_detail.email}
                </a>
              </span>
              {detail.user_detail.phone_number ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone
                    className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500"
                    aria-hidden
                  />
                  {detail.user_detail.phone_number}
                </span>
              ) : null}
            </>
          ) : undefined
        }
        actions={
          !loading && !error && detail ? (
            <EditButton
              onClick={() =>
                router.push(
                  buildPathWithStoredBack(
                    `${pathname}/edit`,
                    buildCurrentPageBackHref(pathname, searchParams),
                  ),
                )
              }
            />
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
          <DetailPagePadding>
            <div className={detailPageStackClassName}>
            <DetailPanelCard title={t("detail.sectionOverview")}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailMetricCard label={t("fields.firstName")}>
                  {detail.user_detail.first_name || "—"}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.lastName")}>
                  {detail.user_detail.last_name || "—"}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.email")}>
                  <a
                    href={`mailto:${detail.user_detail.email}`}
                    className="break-all font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    {detail.user_detail.email}
                  </a>
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.phone")}>
                  {detail.user_detail.phone_number || "—"}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.gender")}>
                  {detail.user_detail.gender || "—"}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.role")}>
                  {userRoleLabel(detail)}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.inviteStatus")}>
                  {detail.user_detail.invite_status || "—"}
                </DetailMetricCard>
                <DetailMetricCard label={t("fields.invitationSentAt")}>
                  {detail.user_detail.invitation_sent_at
                    ? dateFmt.format(
                        new Date(detail.user_detail.invitation_sent_at),
                      )
                    : "—"}
                </DetailMetricCard>
              </div>
            </DetailPanelCard>
            </div>
          </DetailPagePadding>
        ) : null}
      </SurfaceShell>
    </div>
  );
}
