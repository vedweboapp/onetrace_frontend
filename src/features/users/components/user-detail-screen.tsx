"use client";

import * as React from "react";
import { Mail, Pencil, Phone, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchUserProfile } from "@/features/users/api/user.api";
import type { UserProfile } from "@/features/users/types/user.types";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { AppButton, FieldGroup, SurfaceShell } from "@/shared/ui";

function userRoleLabel(row: UserProfile | null): string {
  if (!row?.role_detail) return "—";
  return row.role_detail.role_name?.trim() || row.role_detail.name?.trim() || "—";
}

export function UserDetailScreen({ userId }: { userId: number }) {
  const t = useTranslations("Dashboard.users");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "settings/users");
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
    () => new Intl.DateTimeFormat(locale === "es" ? "es" : "en", { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={detail ? `${detail.user_detail.first_name ?? ""} ${detail.user_detail.last_name ?? ""}`.trim() || detail.user_detail.email : t("detailMetaTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={detail ? <><span className="inline-flex items-center gap-1.5"><User className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />{userRoleLabel(detail)}</span><span className="inline-flex items-center gap-1.5"><Mail className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden /><a href={`mailto:${detail.user_detail.email}`} className="text-[color:var(--dash-accent)] underline-offset-2 hover:underline">{detail.user_detail.email}</a></span>{detail.user_detail.phone_number ? <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />{detail.user_detail.phone_number}</span> : null}</> : undefined}
        actions={!loading && !error && detail ? <AppButton type="button" variant="primary" size="md" className="gap-2" onClick={() => router.push(`${pathname}/edit?back=${encodeURIComponent(safeBack)}`)}><Pencil className="size-4" strokeWidth={2} aria-hidden />{t("detail.editWithIcon")}</AppButton> : null}
      />

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6"><div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /><div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></div>
        ) : error ? (
          <div className="space-y-4 p-4 sm:p-6"><p className="text-sm text-red-600 dark:text-red-400">{error}</p><AppButton type="button" variant="secondary" size="md" onClick={() => setRefreshNonce((k) => k + 1)}>{t("detail.retry")}</AppButton></div>
        ) : detail ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            <FieldGroup label={t("fields.firstName")}><p className="text-sm text-slate-800 dark:text-slate-200">{detail.user_detail.first_name || "—"}</p></FieldGroup>
            <FieldGroup label={t("fields.lastName")}><p className="text-sm text-slate-800 dark:text-slate-200">{detail.user_detail.last_name || "—"}</p></FieldGroup>
            <FieldGroup label={t("fields.email")}><p className="text-sm text-slate-800 dark:text-slate-200">{detail.user_detail.email}</p></FieldGroup>
            <FieldGroup label={t("fields.phone")}><p className="text-sm text-slate-800 dark:text-slate-200">{detail.user_detail.phone_number || "—"}</p></FieldGroup>
            <FieldGroup label={t("fields.gender")}><p className="text-sm text-slate-800 dark:text-slate-200">{detail.user_detail.gender || "—"}</p></FieldGroup>
            <FieldGroup label={t("fields.role")}><p className="text-sm text-slate-800 dark:text-slate-200">{userRoleLabel(detail)}</p></FieldGroup>
            <FieldGroup label={t("fields.inviteStatus")}><p className="text-sm text-slate-800 dark:text-slate-200">{detail.user_detail.invite_status || "—"}</p></FieldGroup>
            <FieldGroup label={t("fields.invitationSentAt")}><p className="text-sm text-slate-800 dark:text-slate-200">{detail.user_detail.invitation_sent_at ? dateFmt.format(new Date(detail.user_detail.invitation_sent_at)) : "—"}</p></FieldGroup>
          </div>
        ) : null}
      </SurfaceShell>
    </div>
  );
}
