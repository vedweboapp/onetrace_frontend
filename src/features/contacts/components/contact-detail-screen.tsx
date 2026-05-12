"use client";

import * as React from "react";
import { Mail, Pencil, Phone, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContact } from "@/features/contacts/api/contact.api";
import { ContactDetailBody } from "@/features/contacts/components/contact-detail-body";
import type { Contact } from "@/features/contacts/types/contact.types";
import { detailRecordSurfaceShellClassName } from "@/shared/components/layout/detail-metric-card";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { AppButton, SurfaceShell } from "@/shared/ui";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";

function contactClientId(detail: Contact): number | null {
  if (typeof detail.client === "number" && Number.isFinite(detail.client) && detail.client > 0) return detail.client;
  if (detail.client && typeof detail.client === "object" && Number.isFinite(detail.client.id) && detail.client.id > 0) {
    return detail.client.id;
  }
  return null;
}

function contactClientName(detail: Contact, clientNames: Record<number, string>): string {
  if (detail.client && typeof detail.client === "object" && detail.client.name?.trim()) return detail.client.name.trim();
  const id = contactClientId(detail);
  if (id && clientNames[id]) return clientNames[id];
  return id ? `#${id}` : "—";
}

type Props = {
  contactId: number;
};

export function ContactDetailScreen({ contactId }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "contacts");

  const [detail, setDetail] = React.useState<Contact | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [clientNames, setClientNames] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchClientsPage(1, 500);
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of items) mapped[row.id] = row.name;
          setClientNames(mapped);
        }
      } catch {
        if (!cancelled) setClientNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        const row = await fetchContact(contactId);
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
  }, [contactId, refreshNonce, t]);

  const phoneRaw = detail?.phone?.trim() ?? "";

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={detail?.name ?? (loading ? t("detail.loadingTitle") : t("detailMetaTitle"))}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={
          detail ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <User className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                {contactClientName(detail, clientNames)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                <a
                  href={`mailto:${detail.email}`}
                  className="text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {detail.email}
                </a>
              </span>
              {phoneRaw ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                  <a
                    href={`tel:${phoneRaw.replace(/\s/g, "")}`}
                    className="text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    {phoneRaw}
                  </a>
                </span>
              ) : null}
            </>
          ) : undefined
        }
        actions={
          !loading && !error && detail ? (
            <AppButton
              type="button"
              variant="primary"
              size="md"
              className="gap-2"
              onClick={() => router.push(`${pathname}/edit?back=${encodeURIComponent(safeBack ?? routes.dashboard.contacts)}`)}
            >
              <Pencil className="size-4" strokeWidth={2} aria-hidden />
              {t("edit")}
            </AppButton>
          ) : null
        }
      />

      <SurfaceShell className={detailRecordSurfaceShellClassName}>
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
          <ContactDetailBody detail={detail} clientName={contactClientName(detail, clientNames)} dateFmt={dateFmt} />
        ) : null}
      </SurfaceShell>
    </div>
  );
}
