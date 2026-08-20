"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { updateQuotation } from "@/features/quotations/api/quotation.api";
import { QUOTE_CATEGORY } from "@/features/quotations/constants/quotation-category";
import type {
  QuotationContactNested,
  QuotationDetail,
  QuotationUserRef,
} from "@/features/quotations/types/quotation.types";
import { QuotationDraftComposer } from "@/features/quotations/components/quotation-draft-composer";
import {
  getQuotationAdditionalContactEntries,
  getQuotationAdditionalContactIds,
  getQuotationContactId,
  getQuotationCustomerId,
  getQuotationOptionalUserId,
  getQuotationProjectId,
  getQuotationSiteIds,
  getQuotationTagIds,
  quotationCustomerLabel,
  quotationProjectLabel,
  quotationSiteListRows,
  quotationTagsLabels,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import {
  quotationSiteSnapshotToAddressMapPoint,
  siteToAddressMapPoint,
} from "@/features/quotations/utils/quotation-site-map.util";
import { seedDraftFromQuoteSections } from "@/features/quotations/utils/quotation-draft-seed.util";
import {
  QUOTATION_STATUS_OPTIONS,
  normalizeQuotationStatusValue,
  quotationStatusLabel,
} from "@/features/quotations/utils/quotation-status.util";
import type { Site } from "@/features/sites/types/site.types";
import { DetailEntityLink, DetailSystemMetadataSection, DetailUserAttribution, normalizeDetailAuditUser } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailFormattedAddress, hasDetailAddress } from "@/shared/components/layout/detail-formatted-address";
import { What3WordsInline } from "@/shared/components/layout/what3words-inline";
import {
  DetailPageMapLayout,
  detailMapFillClassName,
  detailMapViewportClassName,
} from "@/shared/components/layout/detail-page-map-layout";
import {
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";
import { AppTabs } from "@/shared/ui";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { routes } from "@/shared/config/routes";
import {
  formatApiDateForHtmlDateInput,
  formatFlexibleApiDate,
} from "@/shared/utils/api-date-parse.util";
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

type AdditionalContactEntry = ReturnType<typeof getQuotationAdditionalContactEntries>[number];


function QuotationDetailPeopleSection({
  detail,
  additionalContactEntries = [],
  t,
  tActions,
  contactOptions,
  salespersonOptions,
  onSaveField,
}: {
  detail: QuotationDetail;
  additionalContactEntries?: AdditionalContactEntry[];
  t: ReturnType<typeof useTranslations<"Dashboard.quotations">>;
  tActions: ReturnType<typeof useTranslations<"Dashboard.common.actions">>;
  contactOptions: CheckmarkSelectOption[];
  salespersonOptions: CheckmarkSelectOption[];
  onSaveField: (body: Parameters<typeof updateQuotation>[1]) => Promise<void>;
}) {
  const salespersonId = getQuotationOptionalUserId(detail.salesperson);
  const primaryContactId = getQuotationContactId(detail.primary_customer_contact);
  const additionalIds = getQuotationAdditionalContactIds(detail.additional_customer_contact);

  return (
    <DetailPanelCard title={t("detail.sectionPeople")}>
      <DetailMetricsGrid>
        <DetailEditableField
          label={t("fields.salesperson")}
          value={salespersonId != null ? String(salespersonId) : ""}
          kind="select"
          options={salespersonOptions}
          editAriaLabel={tActions("edit")}
          empty="—"
          onSave={(next) =>
            onSaveField({ salesperson: next.trim() ? Number(next) : null })
          }
        >
          <DetailUserAttribution user={quotationAssigneeToAudit(detail.salesperson)} />
        </DetailEditableField>
        <DetailEditableField
          label={t("fields.primaryContact")}
          value={primaryContactId != null ? String(primaryContactId) : ""}
          kind="select"
          options={contactOptions}
          editAriaLabel={tActions("edit")}
          empty="—"
          onSave={(next) =>
            onSaveField({
              primary_customer_contact: next.trim() ? Number(next) : null,
            })
          }
        >
          <DetailUserAttribution user={quotationContactToAudit(detail.primary_customer_contact)} />
        </DetailEditableField>
        <DetailEditableField
          span="full"
          label={t("fields.additionalContacts")}
          kind="multiselect"
          values={additionalIds.map(String)}
          options={contactOptions}
          editAriaLabel={tActions("edit")}
          empty="—"
          onSaveValues={(next) =>
            onSaveField({
              additional_customer_contact: next.map((id) => Number(id)).filter(Number.isFinite),
            })
          }
        >
          {additionalContactEntries.length === 0 ? null : (
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
        </DetailEditableField>
      </DetailMetricsGrid>
    </DetailPanelCard>
  );
}

const AddressMultiMiniMap = dynamic(
  () => import("@/shared/components/maps/address-multi-mini-map").then((m) => m.AddressMultiMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className={cn(detailMapViewportClassName, "w-full animate-pulse bg-slate-200/80 dark:bg-slate-800/80")} />
    ),
  },
);

const detailEntityLinkClassName =
  "font-medium text-blue-600 underline-offset-2 hover:underline";

type Props = {
  detail: QuotationDetail;
  /** When `customer` is a bare id, resolve the name from your clients cache. */
  customerName?: string;
  /** When `project` is a bare id, resolve the name from your projects cache. */
  projectName?: string;
  /** Resolve site labels when API returns bare ids. */
  siteNames?: Record<number, string>;
  /** When `tags` are bare ids, resolve display names from your tags cache. */
  tagLookup?: Record<number, string>;
  siteDetails: Site[];
  siteDetailsLoading: boolean;
  dateFmt: Intl.DateTimeFormat;
  dueFmt: Intl.DateTimeFormat;
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
  clientOptions?: CheckmarkSelectOption[];
  projectOptions?: CheckmarkSelectOption[];
  siteOptions?: CheckmarkSelectOption[];
  tagOptions?: CheckmarkSelectOption[];
  contactOptions?: CheckmarkSelectOption[];
  salespersonOptions?: CheckmarkSelectOption[];
};

export function QuotationDetailBody({
  detail,
  customerName,
  projectName,
  siteNames,
  tagLookup,
  siteDetails,
  siteDetailsLoading,
  dateFmt,
  dueFmt,
  onSaved,
  clientOptions = [],
  projectOptions = [],
  siteOptions = [],
  tagOptions = [],
  contactOptions = [],
  salespersonOptions = [],
}: Props) {
  const t = useTranslations("Dashboard.quotations");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [detailTab, setDetailTab] = React.useState<"project" | "pricing">(() =>
    searchParams.get("tab") === "pricing" ? "pricing" : "project",
  );

  const statusOptions = React.useMemo(
    () =>
      QUOTATION_STATUS_OPTIONS.map((row) => ({
        value: row.value,
        label: t(row.labelKey),
      })),
    [t],
  );

  const patchField = useDetailPatch(
    (body: Parameters<typeof updateQuotation>[1]) => updateQuotation(detail.id, body),
    { success: t("updatedToast"), error: t("saveError") },
    onSaved,
  );

  const goToTab = React.useCallback(
    (tab: "project" | "pricing") => {
      setDetailTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "pricing") params.set("tab", "pricing");
      else params.delete("tab");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    setDetailTab(searchParams.get("tab") === "pricing" ? "pricing" : "project");
  }, [detail.id, searchParams]);

  const siteRows = React.useMemo(() => quotationSiteListRows(detail, siteNames), [detail, siteNames]);

  const siteMapPoints = React.useMemo(() => {
    if (siteDetails.length > 0) {
      return siteDetails.map((site) => siteToAddressMapPoint(site));
    }
    const snapshots = [
      ...(detail.site_snapshots ?? []),
      ...(detail.site_snapshot ? [detail.site_snapshot] : []),
    ];
    return snapshots.map((snap) => quotationSiteSnapshotToAddressMapPoint(snap));
  }, [detail.site_snapshot, detail.site_snapshots, siteDetails]);

  const tagsLabel = quotationTagsLabels(detail.tags, tagLookup);

  const quoteSectionsSorted = React.useMemo(() => {
    const rows = detail.quote_sections;
    if (!rows?.length) return [];
    return [...rows].sort((a, b) => a.section_order - b.section_order);
  }, [detail.quote_sections]);

  const viewDraft = React.useMemo(
    () => (quoteSectionsSorted.length > 0 ? seedDraftFromQuoteSections(quoteSectionsSorted) : null),
    [quoteSectionsSorted],
  );

  const additionalContactEntries = React.useMemo(
    () => getQuotationAdditionalContactEntries(detail.additional_customer_contact),
    [detail.additional_customer_contact],
  );
  const customerId = getQuotationCustomerId(detail.customer);
  const projectId = getQuotationProjectId(detail.project);

  const dueLabel = formatFlexibleApiDate(detail.due_date, dueFmt);
  const statusValue = normalizeQuotationStatusValue(detail.status);

  const desc = detail.description?.trim() ?? "";
  const modifiedAt = detail.modified_at ?? detail.created_at;

  const overviewCard = (
    <DetailPanelCard title={t("detail.sectionOverview")}>
      <DetailMetricsGrid>
        <DetailEditableField
          label={t("table.status")}
          value={statusValue}
          kind="select"
          options={statusOptions}
          editAriaLabel={tActions("edit")}
          onSave={(next) => patchField({ status: next })}
        >
          {quotationStatusLabel(detail.status, t)}
        </DetailEditableField>
        <DetailEditableField
          label={t("fields.quoteName")}
          value={detail.quote_name}
          kind="text"
          editAriaLabel={tActions("edit")}
          onSave={(next) => patchField({ quote_name: next })}
        >
          {detail.quote_name}
        </DetailEditableField>
        <DetailEditableField
          label={t("fields.customer")}
          value={customerId != null ? String(customerId) : ""}
          kind="select"
          options={clientOptions}
          editAriaLabel={tActions("edit")}
          onSave={(next) => patchField({ customer: Number(next) })}
        >
          {customerId != null ? (
            <DetailEntityLink href={`${routes.dashboard.clients}/${customerId}`} className={detailEntityLinkClassName}>
              {quotationCustomerLabel(detail.customer, customerName ?? null)}
            </DetailEntityLink>
          ) : (
            quotationCustomerLabel(detail.customer, customerName ?? null)
          )}
        </DetailEditableField>
        {(detail.quote_category === QUOTE_CATEGORY.project || projectId != null) ? (
          <DetailEditableField
            label={t("fields.project")}
            value={projectId != null ? String(projectId) : ""}
            kind="select"
            options={projectOptions}
            editAriaLabel={tActions("edit")}
            onSave={(next) => patchField({ project: Number(next) })}
          >
            {projectId != null ? (
              <DetailEntityLink href={`${routes.dashboard.projects}/${projectId}`} className={detailEntityLinkClassName}>
                {quotationProjectLabel(detail.project, projectName ?? null)}
              </DetailEntityLink>
            ) : (
              quotationProjectLabel(detail.project, projectName ?? null)
            )}
          </DetailEditableField>
        ) : null}

        <DetailEditableField
          label={t("fields.sites")}
          kind="multiselect"
          values={getQuotationSiteIds(detail).map(String)}
          options={siteOptions}
          editAriaLabel={tActions("edit")}
          empty="—"
          onSaveValues={(next) =>
            patchField({ sites: next.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0) })
          }
        >
          {siteRows.length === 0 ? null : (
            <div className="flex flex-wrap gap-2">
              {siteRows.map((row) => (
                <DetailEntityLink
                  key={row.id}
                  href={`${routes.dashboard.sites}/${row.id}`}
                  className={detailEntityLinkClassName}
                >
                  {row.label}
                </DetailEntityLink>
              ))}
            </div>
          )}
        </DetailEditableField>

        <DetailEditableField
          label={t("fields.tags")}
          kind="multiselect"
          values={getQuotationTagIds(detail.tags).map(String)}
          options={tagOptions}
          editAriaLabel={tActions("edit")}
          empty="—"
          onSaveValues={(next) =>
            patchField({ tags: next.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0) })
          }
        >
          {tagsLabel !== "—" ? tagsLabel : null}
        </DetailEditableField>
        <DetailEditableField
          label={t("fields.orderNumber")}
          value={detail.order_number ?? ""}
          kind="text"
          editAriaLabel={tActions("edit")}
          empty="—"
          onSave={(next) => patchField({ order_number: next || null })}
        >
          {detail.order_number?.trim() ? detail.order_number : null}
        </DetailEditableField>
        <DetailEditableField
          label={t("fields.dueDate")}
          value={formatApiDateForHtmlDateInput(detail.due_date)}
          kind="text"
          editAriaLabel={tActions("edit")}
          empty="—"
          onSave={(next) => patchField({ due_date: next || null })}
        >
          {dueLabel !== "—" ? dueLabel : null}
        </DetailEditableField>
        <DetailEditableField
          label={t("fields.clientResponse")}
          empty="—"
        >
          {detail.comment?.trim() ? (
            <p className="min-w-0 whitespace-pre-wrap break-words text-sm font-bold leading-relaxed [overflow-wrap:anywhere] text-slate-700 dark:text-slate-300">
              {detail.comment}
            </p>
          ) : "-"}
        </DetailEditableField>
        <DetailEditableField
          span="full"
          label={t("fields.description")}
          value={desc}
          kind="text"
          multiline
          editAriaLabel={tActions("edit")}
          empty={t("detail.noDescription")}
          onSave={(next) => patchField({ description: next || null })}
        >
          {desc ? (
            <p className="min-w-0 whitespace-pre-wrap break-words text-sm font-normal leading-relaxed [overflow-wrap:anywhere] text-slate-700 dark:text-slate-300">
              {desc}
            </p>
          ) : null}
        </DetailEditableField>
      </DetailMetricsGrid>
    </DetailPanelCard>
  );

  const siteLocationSplit = React.useMemo(() => {
    if (siteRows.length === 0 && siteMapPoints.length === 0 && !siteDetailsLoading) return null;

    const addressNodes =
      siteDetails.length > 0 ? (
        <ul className="space-y-4">
          {siteDetails.map((site) => (
            <li key={site.id} className="space-y-2 border-t border-slate-200/80 pt-4 first:border-t-0 first:pt-0 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{site.site_name}</p>
              {hasDetailAddress({
                line1: site.address_line_1,
                line2: site.address_line_2,
                city: site.city,
                state: site.state,
                pincode: site.pincode,
                country: site.country,
              }) ? (
                <DetailFormattedAddress
                  line1={site.address_line_1}
                  line2={site.address_line_2}
                  city={site.city}
                  state={site.state}
                  pincode={site.pincode}
                  country={site.country}
                  emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">—</p>}
                />
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("mapNoStructuredAddress")}</p>
              )}
              <What3WordsInline value={site.what3words} label={t("fields.what3words")} />
            </li>
          ))}
        </ul>
      ) : siteDetailsLoading ? null : (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("mapNoStructuredAddress")}</p>
      );

    const mapNode =
      siteDetailsLoading && siteMapPoints.length === 0 ? (
        <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />
      ) : (
        <AddressMultiMiniMap
          points={siteMapPoints}
          className={detailMapFillClassName}
          mapClassName="h-full min-h-0 flex-1"
        />
      );

    return { address: addressNodes, map: mapNode };
  }, [siteDetails, siteDetailsLoading, siteMapPoints, siteRows.length, t]);

  const showMapColumn = siteLocationSplit != null;

  return (
    <DetailPagePadding>
      <AppTabs
        tabs={[
          { id: "project", label: t("formTabs.project") },
          { id: "pricing", label: t("formTabs.pricing") },
        ]}
        value={detailTab}
        onValueChange={(id) => goToTab(id === "pricing" ? "pricing" : "project")}
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
          mapFillHeight={showMapColumn}
          mapTitle={t("detail.sectionMap")}
          map={siteLocationSplit?.map ?? null}
        >
          {overviewCard}

          {showMapColumn ? (
            <DetailPanelCard title={t("detail.sectionSiteAddress")}>
              {siteLocationSplit?.address ?? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("mapNoStructuredAddress")}</p>
              )}
            </DetailPanelCard>
          ) : null}

          <QuotationDetailPeopleSection
            detail={detail}
            additionalContactEntries={additionalContactEntries}
            t={t}
            tActions={tActions}
            contactOptions={contactOptions}
            salespersonOptions={salespersonOptions}
            onSaveField={patchField}
          />

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
