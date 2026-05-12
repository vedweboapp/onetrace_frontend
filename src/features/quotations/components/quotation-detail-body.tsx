"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import type {
  QuotationContactNested,
  QuotationDetail,
  QuotationUserRef,
} from "@/features/quotations/types/quotation.types";
import { QuotationDraftComposer } from "@/features/quotations/components/quotation-draft-composer";
import {
  getQuotationNestedSite,
  getQuotationSiteId,
  getQuotationTechnicianEntries,
  quotationCustomerLabel,
  quotationSiteLabel,
  quotationTagsLabels,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import { seedDraftFromQuoteSections } from "@/features/quotations/utils/quotation-draft-seed.util";
import type { Site } from "@/features/sites/types/site.types";
import { DetailFormattedAddress, hasDetailAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { AppTabs } from "@/shared/ui";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { cn } from "@/core/utils/http.util";

function QuotationPersonCell({
  label,
  primary,
  secondary,
}: {
  /** Omit or leave empty for compact tiles (e.g. technician list). */
  label?: string;
  primary: string;
  secondary: string | null;
}) {
  const empty = primary === "—" || primary.trim() === "";
  const hasLabel = typeof label === "string" && label.trim().length > 0;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/45">
      {hasLabel ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">{label}</p>
      ) : null}
      {empty ? (
        <p className={cn("text-sm text-slate-500 dark:text-slate-400", hasLabel && "mt-2")}>—</p>
      ) : (
        <>
          <p
            className={cn(
              "break-words text-base font-semibold leading-snug text-slate-900 dark:text-slate-100",
              hasLabel && "mt-2",
            )}
          >
            {primary}
          </p>
          {secondary ? (
            <p className="mt-1 break-words text-sm leading-relaxed text-slate-600 dark:text-slate-400">{secondary}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

function QuotationUserPersonCell({
  label,
  user,
}: {
  label?: string;
  user: string | number | QuotationUserRef | null | undefined;
}) {
  if (user == null) return <QuotationPersonCell label={label} primary="—" secondary={null} />;
  if (typeof user === "number")
    return <QuotationPersonCell label={label} primary={Number.isFinite(user) && user > 0 ? `#${user}` : "—"} secondary={null} />;
  if (typeof user === "string") {
    const s = user.trim();
    return <QuotationPersonCell label={label} primary={s.length > 0 ? s : "—"} secondary={null} />;
  }
  const u = user.username?.trim() ?? "";
  const mail = user.email?.trim() ?? "";
  const primary = u || mail || (user.id > 0 ? `#${user.id}` : "—");
  const secondary = u && mail && u !== mail ? mail : null;
  return <QuotationPersonCell label={label} primary={primary} secondary={secondary} />;
}

function QuotationContactPersonCell({
  label,
  contact,
}: {
  label?: string;
  contact: number | QuotationContactNested | null | undefined;
}) {
  if (contact == null) return <QuotationPersonCell label={label} primary="—" secondary={null} />;
  if (typeof contact === "number")
    return (
      <QuotationPersonCell label={label} primary={Number.isFinite(contact) && contact > 0 ? `#${contact}` : "—"} secondary={null} />
    );
  const name = typeof contact.name === "string" ? contact.name.trim() : "";
  const email = typeof contact.email === "string" ? contact.email.trim() : "";
  const phone = typeof contact.phone === "string" ? contact.phone.trim() : "";
  const primary = name || email || phone || (contact.id > 0 ? `#${contact.id}` : "—");
  let secondary: string | null = null;
  if (name) {
    if (email) secondary = email;
    else if (phone) secondary = phone;
  } else if (email && phone) secondary = phone;
  else if (email && !name) secondary = null;
  if (secondary && secondary === primary) secondary = null;
  return <QuotationPersonCell label={label} primary={primary} secondary={secondary} />;
}

const AddressMiniMap = dynamic(
  () => import("@/shared/components/maps/address-mini-map").then((m) => m.AddressMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
    ),
  },
);

type Props = {
  detail: QuotationDetail;
  /** When `customer` is a bare id, resolve the name from your clients cache. */
  customerName?: string;
  /** When `site` is a bare id, resolve the label from your sites cache. */
  siteName?: string;
  /** When `tags` are bare ids, resolve display names from your tags cache. */
  tagLookup?: Record<number, string>;
  siteDetail: Site | null;
  siteDetailLoading: boolean;
  dateFmt: Intl.DateTimeFormat;
  dueFmt: Intl.DateTimeFormat;
};

export function QuotationDetailBody({
  detail,
  customerName,
  siteName,
  tagLookup,
  siteDetail,
  siteDetailLoading,
  dateFmt,
  dueFmt,
}: Props) {
  const t = useTranslations("Dashboard.quotations");
  const locale = useLocale();
  const [detailTab, setDetailTab] = React.useState<"project" | "pricing">("project");

  React.useEffect(() => {
    setDetailTab("project");
  }, [detail.id]);

  const snap = detail.site_snapshot;
  const snapshotAddressUsable =
    !!snap &&
    hasDetailAddress({
      line1: snap.address_line_1,
      line2: snap.address_line_2,
      city: snap.city,
      state: snap.state,
      pincode: snap.pincode,
      country: snap.country,
    });

  const nestedSite = getQuotationNestedSite(detail.site);
  const nestedSiteAddressUsable =
    !!nestedSite &&
    hasDetailAddress({
      line1: nestedSite.address_line_1,
      line2: nestedSite.address_line_2,
      city: nestedSite.city,
      state: nestedSite.state,
      pincode: nestedSite.pincode,
      country: nestedSite.country,
    });

  const quoteSectionsSorted = React.useMemo(() => {
    const rows = detail.quote_sections;
    if (!rows?.length) return [];
    return [...rows].sort((a, b) => a.section_order - b.section_order);
  }, [detail.quote_sections]);

  const viewDraft = React.useMemo(
    () => (quoteSectionsSorted.length > 0 ? seedDraftFromQuoteSections(quoteSectionsSorted) : null),
    [quoteSectionsSorted],
  );

  const siteIdResolved = getQuotationSiteId(detail.site);
  const modifiedAtLabel = detail.modified_at
    ? dateFmt.format(new Date(detail.modified_at))
    : "—";

  const tagsLabel = quotationTagsLabels(detail.tags, tagLookup);
  const technicianEntries = React.useMemo(() => getQuotationTechnicianEntries(detail), [detail]);

  const dueLabel = formatFlexibleApiDate(detail.due_date, dueFmt);

  const createdByUser =
    detail.created_by && typeof detail.created_by === "object" ? detail.created_by : null;

  const desc = detail.description?.trim() ?? "";

  function quoteStatusLabel(code: string | null | undefined) {
    const raw = code == null ? "" : String(code).trim();
    if (!raw) return "—";
    const c = raw.toLowerCase();
    if (c === "draft") return t("quoteStatus.draft");
    if (c === "sent") return t("quoteStatus.sent");
    if (c === "accepted") return t("quoteStatus.accepted");
    if (c === "rejected") return t("quoteStatus.rejected");
    return raw;
  }

  const overviewCard = (
    <DetailPanelCard title={t("detail.sectionOverview")}>
      <DetailMetricsGrid>
        <DetailMetricCard label={t("fields.quoteName")}>{detail.quote_name}</DetailMetricCard>
        <DetailMetricCard label={t("fields.customer")}>
          {quotationCustomerLabel(detail.customer, customerName ?? null)}
        </DetailMetricCard>
        <DetailMetricCard label={t("fields.site")}>
          {quotationSiteLabel(detail.site, snap?.site_name?.trim() || siteName?.trim() || null)}
        </DetailMetricCard>
        <DetailMetricCard label={t("fields.tags")}>{tagsLabel}</DetailMetricCard>
        <DetailMetricCard label={t("fields.orderNumber")}>{detail.order_number?.trim() || "—"}</DetailMetricCard>
        <DetailMetricCard label={t("fields.dueDate")}>{dueLabel}</DetailMetricCard>
        <DetailMetricCard label={t("table.status")}>{quoteStatusLabel(detail.status)}</DetailMetricCard>
      </DetailMetricsGrid>
    </DetailPanelCard>
  );

  const descriptionCard = (
    <DetailPanelCard title={t("fields.description")}>
      {desc ? (
        <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/40">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">{desc}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.noDescription")}</p>
      )}
    </DetailPanelCard>
  );

  const siteLocationCard =
    siteIdResolved != null &&
    (snapshotAddressUsable || nestedSiteAddressUsable || siteDetailLoading || siteDetail) ? (
      <DetailPanelCard
        title={t("detail.sectionSiteLocation")}
        className="flex h-full min-h-0 flex-col"
        bodyClassName="flex min-h-0 flex-1 flex-col"
      >
        {snapshotAddressUsable && snap ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <DetailFormattedAddress
              line1={snap.address_line_1}
              line2={snap.address_line_2}
              city={snap.city}
              state={snap.state}
              pincode={snap.pincode}
              country={snap.country}
              emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">—</p>}
            />
            <AddressMiniMap
              addressParts={{
                line1: snap.address_line_1,
                line2: snap.address_line_2,
                city: snap.city,
                state: snap.state,
                pincode: snap.pincode,
                country: snap.country,
              }}
              className="flex min-h-[200px] flex-1 flex-col"
              mapClassName="min-h-0 flex-1"
            />
          </div>
        ) : nestedSiteAddressUsable && nestedSite ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <DetailFormattedAddress
              line1={nestedSite.address_line_1}
              line2={nestedSite.address_line_2}
              city={nestedSite.city}
              state={nestedSite.state}
              pincode={nestedSite.pincode}
              country={nestedSite.country}
              emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">—</p>}
            />
            <AddressMiniMap
              addressParts={{
                line1: nestedSite.address_line_1,
                line2: nestedSite.address_line_2,
                city: nestedSite.city,
                state: nestedSite.state,
                pincode: nestedSite.pincode,
                country: nestedSite.country,
              }}
              className="flex min-h-[200px] flex-1 flex-col"
              mapClassName="min-h-0 flex-1"
            />
          </div>
        ) : siteDetailLoading ? (
          <div className="min-h-[13rem] flex-1 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ) : siteDetail ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {hasDetailAddress({
              line1: siteDetail.address_line_1,
              line2: siteDetail.address_line_2,
              city: siteDetail.city,
              state: siteDetail.state,
              pincode: siteDetail.pincode,
              country: siteDetail.country,
            }) ? (
              <DetailFormattedAddress
                line1={siteDetail.address_line_1}
                line2={siteDetail.address_line_2}
                city={siteDetail.city}
                state={siteDetail.state}
                pincode={siteDetail.pincode}
                country={siteDetail.country}
                emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">—</p>}
              />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("mapNoStructuredAddress")}</p>
            )}
            <AddressMiniMap
              addressParts={{
                line1: siteDetail.address_line_1,
                line2: siteDetail.address_line_2,
                city: siteDetail.city,
                state: siteDetail.state,
                pincode: siteDetail.pincode,
                country: siteDetail.country,
              }}
              className="flex min-h-[200px] flex-1 flex-col"
              mapClassName="min-h-0 flex-1"
            />
          </div>
        ) : null}
      </DetailPanelCard>
    ) : null;

  const showSiteMapColumn = siteLocationCard != null;

  return (
    <DetailPagePadding>
      <AppTabs
        tabs={[
          { id: "project", label: t("formTabs.project") },
          { id: "pricing", label: t("formTabs.pricing") },
        ]}
        value={detailTab}
        onValueChange={(id) => setDetailTab(id === "pricing" ? "pricing" : "project")}
        ariaLabel={t("formTabs.aria")}
        panelIdPrefix="quotation-detail"
        className="mb-1"
      />
      <div
        role="tabpanel"
        id="quotation-detail-project"
        aria-labelledby="quotation-detail-trigger-project"
        className={cn(detailTab !== "project" && "hidden")}
      >
        <div
          className={cn(
            showSiteMapColumn && "grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8",
            !showSiteMapColumn && "space-y-5",
          )}
        >
          <div className="min-w-0 space-y-5">
            {overviewCard}
            {descriptionCard}

            <DetailPanelCard title={t("detail.sectionPeople")}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <QuotationUserPersonCell label={t("fields.salesperson")} user={detail.salesperson} />
                <QuotationUserPersonCell label={t("fields.projectManager")} user={detail.project_manager} />
                <QuotationContactPersonCell label={t("fields.primaryContact")} contact={detail.primary_customer_contact} />
                <QuotationContactPersonCell label={t("fields.additionalContact")} contact={detail.additional_customer_contact} />
                <div className="sm:col-span-2 xl:col-span-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                    {t("fields.technicians")}
                  </p>
                  {technicianEntries.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">—</p>
                  ) : (
                    <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {technicianEntries.map((entry, ti) =>
                        entry.kind === "id" ? (
                          <li key={`tech-id-${entry.id}-${ti}`}>
                            <QuotationPersonCell primary={`#${entry.id}`} secondary={null} />
                          </li>
                        ) : (
                          <li key={`tech-${entry.user.id}-${ti}`}>
                            <QuotationUserPersonCell user={entry.user} />
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </DetailPanelCard>

            <div
              className={cn(
                "grid gap-5",
                createdByUser ? "sm:grid-cols-2" : "grid-cols-1",
              )}
            >
              <DetailPanelCard title={t("detail.sectionRecord")}>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="text-slate-600 dark:text-slate-400">{t("fields.createdAt")}</span>
                    <span className="font-medium break-words text-slate-900 dark:text-slate-100">
                      {dateFmt.format(new Date(detail.created_at))}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="text-slate-600 dark:text-slate-400">{t("fields.updatedAt")}</span>
                    <span className="font-medium break-words text-slate-900 dark:text-slate-100">{modifiedAtLabel}</span>
                  </div>
                </div>
              </DetailPanelCard>

              {createdByUser ? (
                <DetailPanelCard title={t("fields.createdBy")}>
                  <p className="break-words text-base font-semibold text-slate-900 dark:text-slate-100">
                    {createdByUser.username?.trim() || createdByUser.email?.trim() || `#${createdByUser.id}`}
                  </p>
                  {createdByUser.email?.trim() &&
                  createdByUser.username?.trim() &&
                  createdByUser.email.trim() !== createdByUser.username.trim() ? (
                    <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-400">{createdByUser.email}</p>
                  ) : null}
                </DetailPanelCard>
              ) : null}
            </div>
          </div>

          {showSiteMapColumn ? (
            <div className="flex min-h-0 min-w-0 flex-col lg:h-full">{siteLocationCard}</div>
          ) : null}
        </div>
      </div>

      <div
        role="tabpanel"
        id="quotation-detail-pricing"
        aria-labelledby="quotation-detail-trigger-pricing"
        className={cn(detailTab !== "pricing" && "hidden")}
      >
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-100">{t("levels.sectionsTitle")}</p>
          {viewDraft ? (
            <QuotationDraftComposer
              draft={viewDraft}
              onDraftChange={() => {}}
              saving={false}
              canShow
              readOnly
            />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("page.editQuoteScopeEmpty")}</p>
          )}
        </div>
      </div>
    </DetailPagePadding>
  );
}
