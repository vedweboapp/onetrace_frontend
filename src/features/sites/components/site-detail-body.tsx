"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { patchSite, updateSite } from "@/features/sites/api/site.api";
import type { Site, SiteUpdatePayload } from "@/features/sites/types/site.types";
import {
  formatSiteContactPersonContactLabel,
  getSiteContactPersonContactId,
  normalizeSiteContactPersonsFromApi,
} from "@/features/sites/utils/site-contact-person.util";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
  DetailAddressLocationFields,
  detailLocationCountryPayload,
  detailLocationStatePayload,
} from "@/shared/components/layout/detail-address-location-fields";
import { countryIsoFromName } from "@/shared/form/entity-address-form.util";
import {
  DetailPageMapLayout,
  detailMapFillClassName,
} from "@/shared/components/layout/detail-page-map-layout";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { ActiveStatusBadge } from "@/shared/ui";

const AddressMiniMap = dynamic(
  () => import("@/shared/components/maps/address-mini-map").then((m) => m.AddressMiniMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />,
  },
);

export function SiteDetailBody({
  detail,
  dateFmt,
  clientName,
  contactNameById = {},
  titleNameById = {},
  onSaved,
}: {
  detail: Site;
  dateFmt: Intl.DateTimeFormat;
  clientName: string | null;
  contactNameById?: Record<number, string>;
  titleNameById?: Record<string, string>;
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
}) {
  const t = useTranslations("Dashboard.sites");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
  const clientId =
    typeof detail.client === "number"
      ? detail.client
      : typeof detail.client?.id === "number"
        ? detail.client.id
        : null;
  const contactPersonRows = normalizeSiteContactPersonsFromApi(detail);

  const statusOptions = React.useMemo(
    () => [
      { value: "true", label: t("status.active") },
      { value: "false", label: t("status.inactive") },
    ],
    [t],
  );

  async function patchActive(is_active: boolean) {
    try {
      await patchSite(detail.id, { is_active });
      toastSuccess(t("updatedToast"));
      onSaved?.();
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
      throw error;
    }
  }

  async function patchSiteField(body: Partial<SiteUpdatePayload>) {
    try {
      await updateSite(detail.id, body as SiteUpdatePayload);
      toastSuccess(t("updatedToast"));
      onSaved?.();
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
      throw error;
    }
  }

  const addressParts = {
    line1: detail.address_line_1,
    line2: detail.address_line_2,
    city: detail.city,
    state: detail.state,
    pincode: detail.pincode,
    country: detail.country,
  };

  const mapNode = (
    <AddressMiniMap
      addressParts={addressParts}
      coordinates={
        detail.latitude != null &&
        detail.longitude != null &&
        Number.isFinite(detail.latitude) &&
        Number.isFinite(detail.longitude)
          ? { lat: detail.latitude, lon: detail.longitude }
          : null
      }
      className={detailMapFillClassName}
      mapClassName="h-full min-h-0 flex-1"
    />
  );

  return (
    <DetailPagePadding>
      <DetailPageMapLayout map={mapNode} mapTitle={t("detail.sectionMap")} showMap>
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid compact>
            <DetailEditableField
              label={t("fields.siteName")}
              value={detail.site_name}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchSiteField({ site_name: next })}
            >
              {detail.site_name}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.status")}
              value={detail.is_active ? "true" : "false"}
              kind="select"
              options={statusOptions}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchActive(next === "true")}
            >
              <ActiveStatusBadge
                active={detail.is_active}
                label={detail.is_active ? t("status.active") : t("status.inactive")}
              />
            </DetailEditableField>
            <DetailMetricCard label={t("fields.client")}>
              {clientId ? (
                <DetailEntityLink
                  href={`${routes.dashboard.clients}/${clientId}`}
                  className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {clientName ?? "—"}
                </DetailEntityLink>
              ) : (
                <span>{clientName ?? "—"}</span>
              )}
            </DetailMetricCard>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("contactPerson.sectionTitle")}>
          {contactPersonRows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("contactPerson.empty")}</p>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 dark:text-slate-500">
                  {t("contactPerson.titleLabel")}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 dark:text-slate-500">
                  {t("contactPerson.contactLabel")}
                </span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {contactPersonRows.map((row, index) => {
                  const contactId = getSiteContactPersonContactId(row.contact);
                  const contactLabel = formatSiteContactPersonContactLabel(row.contact, contactNameById);
                  return (
                    <li
                      key={row.id ?? `${row.title}-${contactId ?? index}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 last:pb-0"
                    >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {(() => {
                        // API sometimes returns title as an object — coerce to string safely
                        const rawTitle = row.title;
                        const titleKey: string =
                          rawTitle && typeof rawTitle === "object"
                            ? String((rawTitle as Record<string, unknown>).title ?? (rawTitle as Record<string, unknown>).name ?? "")
                            : String(rawTitle ?? "");
                        
                        const resolvedTitle = titleNameById[titleKey] || titleKey;
                        const isLegacy = ["site_contact", "finance", "emergency"].includes(resolvedTitle);
                        if (isLegacy) {
                          return t(`contactPerson.titles.${resolvedTitle}`, { defaultValue: resolvedTitle });
                        }
                        return resolvedTitle || "—";
                      })()}
                    </span>
                    {contactId ? (
                      <DetailEntityLink
                        href={`${routes.dashboard.contacts}/${contactId}`}
                        className="text-sm font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                      >
                        {contactLabel}
                      </DetailEntityLink>
                    ) : (
                      <span className="text-sm text-slate-600 dark:text-slate-400">{contactLabel}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            </div>
          )}
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionAddress")}>
          <DetailMetricsGrid compact>
            <DetailEditableField
              label={t("fields.addressLine1")}
              value={addressParts.line1 ?? ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchSiteField({ address_line_1: next })}
            >
              {addressParts.line1?.trim() ? addressParts.line1 : null}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.addressLine2")}
              value={addressParts.line2 ?? ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              empty="—"
              onSave={(next) => patchSiteField({ address_line_2: next })}
            >
              {addressParts.line2?.trim() ? addressParts.line2 : null}
            </DetailEditableField>
            <DetailAddressLocationFields
              country={addressParts.country}
              state={addressParts.state}
              city={addressParts.city}
              labels={{
                country: t("fields.country"),
                state: t("fields.stateProvince"),
                city: t("fields.city"),
              }}
              editAriaLabel={tActions("edit")}
              onSaveCountry={async (countryIso) => {
                await patchSiteField({
                  country: detailLocationCountryPayload(countryIso),
                  state: "",
                  city: "",
                });
              }}
              onSaveState={async (stateIsoOrName) => {
                const iso = countryIsoFromName(addressParts.country);
                await patchSiteField({
                  state: detailLocationStatePayload(iso, stateIsoOrName) || stateIsoOrName,
                  city: "",
                });
              }}
              onSaveCity={(cityName) => patchSiteField({ city: cityName })}
            />
            <DetailEditableField
              label={t("fields.pincode")}
              value={addressParts.pincode ?? ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchSiteField({ pincode: next })}
            >
              {addressParts.pincode?.trim() ? addressParts.pincode : null}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.what3words")}
              value={detail.what3words ?? ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              empty="—"
              onSave={(next) => patchSiteField({ what3words: next })}
            >
              {detail.what3words?.trim() ? detail.what3words : null}
            </DetailEditableField>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailSystemMetadataSection
          createdAt={detail.created_at}
          modifiedAt={detail.modified_at}
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
    </DetailPagePadding>
  );
}
