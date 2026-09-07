"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { patchSite, updateSite } from "@/features/sites/api/site.api";
import { SiteDetailContactPersonsEditor } from "@/features/sites/components/site-detail-contact-persons-editor";
import type { Site, SiteContactPersonPayload, SiteUpdatePayload } from "@/features/sites/types/site.types";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
  DetailAddressLine1EditableField,
  flatAddressPatchFromPlace,
} from "@/shared/components/layout/detail-address-line1-field";
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
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";
import { ActiveStatusBadge, type CheckmarkSelectOption } from "@/shared/ui";

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
  clientOptions = [],
  contactNameById = {},
  titleNameById = {},
  onSaved,
}: {
  detail: Site;
  dateFmt: Intl.DateTimeFormat;
  clientName: string | null;
  clientOptions?: CheckmarkSelectOption[];
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

  const statusOptions = React.useMemo(
    () => [
      { value: "true", label: t("status.active") },
      { value: "false", label: t("status.inactive") },
    ],
    [t],
  );

  const clientSelectOptions = React.useMemo(() => {
    const list = [...clientOptions];
    if (clientId != null && !list.some((o) => o.value === String(clientId))) {
      list.unshift({
        value: String(clientId),
        label: clientName?.trim() || `#${clientId}`,
      });
    }
    return list;
  }, [clientOptions, clientId, clientName]);

  const patchActive = useDetailPatch(
    (is_active: boolean) => patchSite(detail.id, { is_active }),
    { success: t("updatedToast"), error: t("toggleActiveError") },
    onSaved,
  );

  const patchSiteField = useDetailPatch(
    (body: Partial<SiteUpdatePayload>) => updateSite(detail.id, body as SiteUpdatePayload),
    { success: t("updatedToast"), error: t("toggleActiveError") },
    onSaved,
  );

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
      <DetailPageMapLayout
        map={mapNode}
        mapTitle={t("detail.sectionMap")}
        showMap
        mapFillHeight
      >
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid>
            <DetailEditableField
              label={t("fields.siteName")}
              value={detail.site_name}
              kind="text"
              required
              requiredMessage={t("validation.siteName")}
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
            <DetailEditableField
              label={t("fields.client")}
              value={clientId != null ? String(clientId) : ""}
              kind="select"
              options={clientSelectOptions}
              selectSearchable
              required
              requiredMessage={t("validation.client")}
              editAriaLabel={tActions("edit")}
              onSave={async (next) => {
                const nextId = Number.parseInt(next, 10);
                if (!Number.isFinite(nextId) || nextId <= 0) return;
                // Changing client clears contact persons (same as create/edit form).
                await patchSiteField({
                  client: nextId,
                  ...(clientId !== nextId ? { contacts: [] as SiteContactPersonPayload[] } : {}),
                });
              }}
            >
              {clientId ? (
                <DetailEntityLink
                  href={`${routes.dashboard.clients}/${clientId}`}
                  className="font-semibold text-blue-600 underline-offset-2 hover:underline"
                >
                  {clientName ?? "—"}
                </DetailEntityLink>
              ) : (
                <span>{clientName ?? "—"}</span>
              )}
            </DetailEditableField>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("contactPerson.sectionTitle")}>
          <SiteDetailContactPersonsEditor
            detail={detail}
            contactNameById={contactNameById}
            titleNameById={titleNameById}
            onSaveContacts={(contacts) => patchSiteField({ contacts })}
          />
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionAddress")}>
          <DetailMetricsGrid>
            <DetailAddressLine1EditableField
              fieldId={String(detail.id)}
              label={t("fields.addressLine1")}
              addressLine1={addressParts.line1}
              country={addressParts.country}
              state={addressParts.state}
              city={addressParts.city}
              pincode={addressParts.pincode}
              required
              requiredMessage={t("validation.addressLine1")}
              editAriaLabel={tActions("edit")}
              onSaveLine={(next) => patchSiteField({ address_line_1: next })}
              onSavePlace={(place) => patchSiteField(flatAddressPatchFromPlace(place))}
            >
              {addressParts.line1?.trim() ? addressParts.line1 : null}
            </DetailAddressLine1EditableField>
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
              requiredMessages={{
                country: t("validation.country"),
                state: t("validation.state"),
                city: t("validation.city"),
              }}
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
              required
              requiredMessage={t("validation.pincode")}
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
