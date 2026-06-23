"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type {
  QuotationContactNested,
  QuotationDetail,
  QuotationUserRef,
} from "@/features/quotations/types/quotation.types";
import { QuotationDraftComposer } from "@/features/quotations/components/quotation-draft-composer";
import {
  getQuotationAdditionalContactEntries,
  getQuotationCustomerId,
  getQuotationNestedSite,
  getQuotationProjectId,
  getQuotationSiteId,
  getQuotationTechnicianEntries,
  quotationCustomerLabel,
  quotationProjectLabel,
  quotationSiteLabel,
  quotationTagsLabels,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import { seedDraftFromQuoteSections } from "@/features/quotations/utils/quotation-draft-seed.util";
import type { Site } from "@/features/sites/types/site.types";
import {
  DetailSystemMetadataSection,
  DetailUserAttribution,
  normalizeDetailAuditUser,
} from "@/shared/components/entity";
import { DetailFormattedAddress, hasDetailAddress } from "@/shared/components/layout/detail-formatted-address";
import { What3WordsInline } from "@/shared/components/layout/what3words-inline";
import {
  DetailPageMapLayout,
  detailMapFillClassName,
  detailMapViewportClassName,
} from "@/shared/components/layout/detail-page-map-layout";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { AppTabs } from "@/shared/ui";
import { routes } from "@/shared/config/routes";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { cn } from "@/core/utils/http.util";

function quotationAssigneeToAudit(
  user: string | number | QuotationUserRef | null | undefined,
): ReturnType<typeof normalizeDetailAuditUser> {
  if (user == null) return null;
  if (typeof user === "number") return normalizeDetailAuditUser(user);
  if (typeof user === "string") {
    const s = user.trim();
    return s ? { username: s } : null;
  }
  return normalizeDetailAuditUser(user);
}

function quotationContactToAudit(
  contact: number | QuotationContactNested | null | undefined,
): ReturnType<typeof normalizeDetailAuditUser> {
  if (contact == null) return null;
  if (typeof contact === "number") return normalizeDetailAuditUser(contact);
  return normalizeDetailAuditUser({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
  });
}

type TechnicianEntry = ReturnType<typeof getQuotationTechnicianEntries>[number];
type AdditionalContactEntry = ReturnType<typeof getQuotationAdditionalContactEntries>[number];

function QuotationDetailPeopleSection({
  detail,
  technicianEntries,
  additionalContactEntries,
  t,
}: {
  detail: QuotationDetail;
  technicianEntries: TechnicianEntry[];
  additionalContactEntries: AdditionalContactEntry[];
  t: ReturnType<typeof useTranslations<"Dashboard.quotations">>;
}) {
  return (
    <DetailPanelCard title={t("detail.sectionPeople")}>
      <DetailMetricsGrid className="sm:grid-cols-2">
        <DetailMetricCard label={t("fields.salesperson")}>
          <DetailUserAttribution user={quotationAssigneeToAudit(detail.salesperson)} />
        </DetailMetricCard>
        {/* <DetailMetricCard label={t("fields.projectManager")}>
          <DetailUserAttribution user={quotationAssigneeToAudit(detail.project_manager)} />
        </DetailMetricCard> */}
        <DetailMetricCard label={t("fields.primaryContact")}>
          <DetailUserAttribution user={quotationContactToAudit(detail.primary_customer_contact)} />
        </DetailMetricCard>
        <DetailMetricCard label={t("fields.additionalContacts")} className="sm:col-span-2">
          {additionalContactEntries.length === 0 ? (
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">—</span>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {additionalContactEntries.map((entry, index) =>
                entry.kind === "id" ? (
                  <DetailUserAttribution key={`addl-id-${entry.id}-${index}`} user={{ id: entry.id }} />
                ) : (
                  <DetailUserAttribution
                    key={`addl-${entry.contact.id}-${index}`}
                    user={quotationContactToAudit(entry.contact)}
                  />
                ),
              )}
            </div>
          )}
        </DetailMetricCard>
        {/* <DetailMetricCard label={t("fields.technicians")} className="sm:col-span-2">
          {technicianEntries.length === 0 ? (
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">—</span>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {technicianEntries.map((entry, ti) =>
                entry.kind === "id" ? (
                  <DetailUserAttribution key={`tech-id-${entry.id}-${ti}`} user={{ id: entry.id }} />
                ) : (
                  <DetailUserAttribution
                    key={`tech-${entry.user.id}-${ti}`}
                    user={quotationAssigneeToAudit(entry.user)}
                  />
                ),
              )}
            </div>
          )}
        </DetailMetricCard> */}
      </DetailMetricsGrid>
    </DetailPanelCard>
  );
}

const AddressMiniMap = dynamic(
  () => import("@/shared/components/maps/address-mini-map").then((m) => m.AddressMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className={cn(detailMapViewportClassName, "w-full animate-pulse bg-slate-200/80 dark:bg-slate-800/80")} />
    ),
  },
);

const detailEntityLinkClassName =
  "font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline";

type Props = {
  detail: QuotationDetail;
  /** When `customer` is a bare id, resolve the name from your clients cache. */
  customerName?: string;
  /** When `project` is a bare id, resolve the name from your projects cache. */
  projectName?: string;
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
  projectName,
  siteName,
  tagLookup,
  siteDetail,
  siteDetailLoading,
  dateFmt,
  dueFmt,
}: Props) {
  const t = useTranslations("Dashboard.quotations");
  const tMeta = useTranslations("Dashboard.common.detail");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [detailTab, setDetailTab] = React.useState<"project" | "pricing">(() =>
    searchParams.get("tab") === "pricing" ? "pricing" : "project",
  );

  React.useEffect(() => {
    setDetailTab(searchParams.get("tab") === "pricing" ? "pricing" : "project");
  }, [detail.id, searchParams]);

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
  const siteWhat3Words =
    snap?.what3words?.trim() || nestedSite?.what3words?.trim() || siteDetail?.what3words?.trim() || "";

  const tagsLabel = quotationTagsLabels(detail.tags, tagLookup);
  const technicianEntries = React.useMemo(() => getQuotationTechnicianEntries(detail), [detail]);
  const additionalContactEntries = React.useMemo(
    () => getQuotationAdditionalContactEntries(detail.additional_customer_contact),
    [detail.additional_customer_contact],
  );
  const customerId = getQuotationCustomerId(detail.customer);
  const projectId = getQuotationProjectId(detail.project);

  const dueLabel = formatFlexibleApiDate(detail.due_date, dueFmt);

  const desc = detail.description?.trim() ?? "";
  const modifiedAt = detail.modified_at ?? detail.created_at;

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailMetricCard label={t("table.status")}>{quoteStatusLabel(detail.status)}</DetailMetricCard>
        <DetailMetricCard label={t("fields.quoteName")}>{detail.quote_name}</DetailMetricCard>
        <DetailMetricCard label={t("fields.customer")}>
          {customerId != null ? (
            <Link href={`${routes.dashboard.clients}/${customerId}`} className={detailEntityLinkClassName}>
              {quotationCustomerLabel(detail.customer, customerName ?? null)}
            </Link>
          ) : (
            quotationCustomerLabel(detail.customer, customerName ?? null)
          )}
        </DetailMetricCard>
        <DetailMetricCard label={t("fields.project")}>
          {projectId != null ? (
            <Link href={`${routes.dashboard.projects}/${projectId}`} className={detailEntityLinkClassName}>
              {quotationProjectLabel(detail.project, projectName ?? null)}
            </Link>
          ) : (
            quotationProjectLabel(detail.project, projectName ?? null)
          )}
        </DetailMetricCard>

        <DetailMetricCard label={t("fields.site")}>
          {
            detail?.sites?.map((site: any, key: any) => {
              return (
                <Link href={`${routes.dashboard.sites}/${site.id}`} key={key} className={cn("mr-2",detailEntityLinkClassName)}>
                  {site.site_name}
                </Link>
              );
            })
          }
        </DetailMetricCard>
        <DetailMetricCard label={t("fields.tags")}>{tagsLabel}</DetailMetricCard>
        <DetailMetricCard label={t("fields.orderNumber")}>{detail.order_number?.trim() || "—"}</DetailMetricCard>
        <DetailMetricCard label={t("fields.dueDate")}>{dueLabel}</DetailMetricCard>
      </div>
    </DetailPanelCard>
  );

  const descriptionCard = (
    <DetailPanelCard title={t("fields.description")} bodyClassName="min-w-0">
      {desc ? (
        <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere] text-slate-700 dark:text-slate-300">
          {desc}
        </p>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.noDescription")}</p>
      )}
    </DetailPanelCard>
  );

  const siteLocationSplit = React.useMemo(() => {
    if (siteIdResolved == null) return null;
    if (!(snapshotAddressUsable || nestedSiteAddressUsable || siteDetailLoading || siteDetail)) return null;

    const mapShell = (addressParts: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      pincode?: string | null;
      country?: string | null;
    }) => (
      <AddressMiniMap
        addressParts={addressParts}
        className={detailMapFillClassName}
        mapClassName="h-full min-h-0 flex-1"
      />
    );

    if (snapshotAddressUsable && snap) {
      const parts = {
        line1: snap.address_line_1,
        line2: snap.address_line_2,
        city: snap.city,
        state: snap.state,
        pincode: snap.pincode,
        country: snap.country,
      };
      return {
        address: (
          <DetailFormattedAddress
            line1={parts.line1}
            line2={parts.line2}
            city={parts.city}
            state={parts.state}
            pincode={parts.pincode}
            country={parts.country}
            emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">—</p>}
          />
        ),
        map: mapShell(parts),
      };
    }

    if (nestedSiteAddressUsable && nestedSite) {
      const parts = {
        line1: nestedSite.address_line_1,
        line2: nestedSite.address_line_2,
        city: nestedSite.city,
        state: nestedSite.state,
        pincode: nestedSite.pincode,
        country: nestedSite.country,
      };
      return {
        address: (
          <DetailFormattedAddress
            line1={parts.line1}
            line2={parts.line2}
            city={parts.city}
            state={parts.state}
            pincode={parts.pincode}
            country={parts.country}
            emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">—</p>}
          />
        ),
        map: mapShell(parts),
      };
    }

    if (siteDetailLoading) {
      return {
        address: null as React.ReactNode,
        map: <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />,
      };
    }

    if (siteDetail) {
      const parts = {
        line1: siteDetail.address_line_1,
        line2: siteDetail.address_line_2,
        city: siteDetail.city,
        state: siteDetail.state,
        pincode: siteDetail.pincode,
        country: siteDetail.country,
      };
      const hasAddr = hasDetailAddress({
        line1: parts.line1,
        line2: parts.line2,
        city: parts.city,
        state: parts.state,
        pincode: parts.pincode,
        country: parts.country,
      });
      return {
        address: hasAddr ? (
          <DetailFormattedAddress
            line1={parts.line1}
            line2={parts.line2}
            city={parts.city}
            state={parts.state}
            pincode={parts.pincode}
            country={parts.country}
            emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">—</p>}
          />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("mapNoStructuredAddress")}</p>
        ),
        map: mapShell(parts),
      };
    }

    return null;
  }, [
    nestedSite,
    nestedSiteAddressUsable,
    siteDetail,
    siteDetailLoading,
    siteIdResolved,
    snap,
    snapshotAddressUsable,
    t,
  ]);

  const showMapColumn = siteLocationSplit != null;

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
        <DetailPageMapLayout
          showMap={showMapColumn}
          mapTitle={t("detail.sectionMap")}
          map={siteLocationSplit?.map ?? null}
        >
          {overviewCard}
          {descriptionCard}

          {showMapColumn ? (
            <DetailPanelCard title={t("detail.sectionSiteAddress")}>
              {siteLocationSplit?.address ?? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("mapNoStructuredAddress")}</p>
              )}
              <What3WordsInline
                value={siteWhat3Words}
                label={t("fields.what3words")}
                className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"
              />
            </DetailPanelCard>
          ) : null}

          <QuotationDetailPeopleSection detail={detail} technicianEntries={technicianEntries} t={t} />

          <DetailSystemMetadataSection
            createdAt={detail.created_at}
            modifiedAt={modifiedAt}
            dateFmt={dateFmt}
            createdBy={detail.created_by}
            modifiedBy={detail.modified_by}
            labels={{
              sectionTitle: tMeta("systemMetadata"),
              createdAt: t("fields.createdAt"),
              updatedAt: t("fields.updatedAt"),
              createdBy: t("fields.createdBy"),
              modifiedBy: tMeta("modifiedBy"),
              notModifiedYet: tMeta("notModifiedYet"),
            }}
          />
        </DetailPageMapLayout>
      </div>

      <div
        role="tabpanel"
        id="quotation-detail-pricing"
        aria-labelledby="quotation-detail-trigger-pricing"
        className={cn(detailTab !== "pricing" && "hidden")}
      >
        <DetailPanelCard title={t("levels.sectionsTitle")}>
          {viewDraft ? (
            <QuotationDraftComposer
              draft={viewDraft}
              onDraftChange={() => { }}
              saving={false}
              canShow
              readOnly
            />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("page.editQuoteScopeEmpty")}</p>
          )}
        </DetailPanelCard>
      </div>
    </DetailPagePadding>
  );
}
