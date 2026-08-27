"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { fetchVendorTypesPage } from "@/features/vendor-types/api/vendor-type.api";
import { updateVendor } from "@/features/vendors/api/vendor.api";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import { VendorTypeChip } from "@/features/vendor-types/components/vendor-type-chip";
import { getVendorTypeIds, getVendorTypeRows, parseVendorCoord } from "@/features/vendors/utils/vendor-nested-fields.util";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailEntityAddressFields } from "@/shared/components/layout/detail-entity-address-fields";
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
import type { AddressMapPoint } from "@/shared/components/maps/google-address-multi-mini-map";
import { entityAddressTypeOptions, sortEntityAddressesForDisplay } from "@/shared/form/entity-address-form.util";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";

const AddressMultiMiniMap = dynamic(
  () => import("@/shared/components/maps/address-multi-mini-map").then((m) => m.AddressMultiMiniMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />,
  },
);

export function VendorDetailBody({
  detail,
  dateFmt,
  onSaved,
}: {
  detail: Vendor;
  dateFmt: Intl.DateTimeFormat;
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
}) {
  const t = useTranslations("Dashboard.vendors");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
  const typeRows = getVendorTypeRows(detail);
  const typeIds = getVendorTypeIds(detail);
  const addresses = detail.addresses ?? [];
  const sortedAddresses = React.useMemo(() => sortEntityAddressesForDisplay(addresses), [addresses]);
  const addressTypeOptions = React.useMemo(() => entityAddressTypeOptions((key) => t(key)), [t]);
  const [vendorTypeOptions, setVendorTypeOptions] = React.useState<{ value: string; label: string }[]>([]);

  const vendorTypeSelectOptions = React.useMemo(() => {
    const optionIds = new Set(vendorTypeOptions.map((opt) => opt.value));
    const extra = typeRows
      .filter((row) => !optionIds.has(String(row.id)))
      .map((row) => ({ value: String(row.id), label: row.name?.trim() || `#${row.id}` }));
    return extra.length > 0 ? [...vendorTypeOptions, ...extra] : vendorTypeOptions;
  }, [vendorTypeOptions, typeRows]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchVendorTypesPage(1, 200, { is_active: true });
        if (!cancelled) {
          setVendorTypeOptions(items.map((row) => ({ value: String(row.id), label: row.name?.trim() || `#${row.id}` })));
        }
      } catch {
        if (!cancelled) setVendorTypeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchField = useDetailPatch(
    (body: Parameters<typeof updateVendor>[1]) => updateVendor(detail.id, body),
    { success: t("updatedToast"), error: t("toggleActiveError") },
    onSaved,
  );

  const patchAddresses = useDetailPatch(
    (addressPayloads: Parameters<typeof updateVendor>[1]["addresses"]) =>
      updateVendor(detail.id, { addresses: addressPayloads ?? [] }),
    { success: t("updatedToast"), error: t("toggleActiveError") },
    onSaved,
  );

  const addressFieldLabels = React.useMemo(
    () => ({
      addressType: t("fields.addressType"),
      addressLine1: t("fields.addressLine1"),
      addressLine2: t("fields.addressLine2"),
      pincode: t("fields.pincode"),
      country: t("fields.country"),
      state: t("fields.stateProvince"),
      city: t("fields.city"),
    }),
    [t],
  );

  const addressRequiredMessages = React.useMemo(
    () => ({
      addressType: t("validation.addressType"),
      addressLine1: t("validation.addressLine1"),
      pincode: t("validation.pincode"),
      country: t("validation.country"),
      state: t("validation.state"),
      city: t("validation.city"),
    }),
    [t],
  );

  const mapPoints: AddressMapPoint[] = sortedAddresses.map(({ address: addr, displayIndex }) => {
    const lat = parseVendorCoord(addr.latitude);
    const lon = parseVendorCoord(addr.longitude);
    return {
      id: addr.id ?? displayIndex,
      label: t("addresses.rowLabel", { index: displayIndex + 1 }),
      addressParts: {
        line1: addr.address_line_1,
        line2: addr.address_line_2,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        country: addr.country,
      },
      coordinates: lat != null && lon != null ? { lat, lon } : null,
    };
  });

  const mapNode = (
    <AddressMultiMiniMap points={mapPoints} className={detailMapFillClassName} mapClassName="h-full min-h-0 flex-1" />
  );

  return (
    <DetailPagePadding>
      <DetailPageMapLayout map={mapNode} mapTitle={t("detail.sectionMap")} showMap mapFillHeight>
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid from="xl" wide>
            <DetailEditableField
              label={t("fields.name")}
              value={detail.name}
              kind="text"
              required
              requiredMessage={t("validation.name")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ name: next })}
            >
              {detail.name}
            </DetailEditableField>
            {vendorTypeSelectOptions.length > 0 ? (
              <DetailEditableField
                label={t("fields.type")}
                kind="multiselect"
                values={typeIds.map(String)}
                options={vendorTypeSelectOptions}
                editAriaLabel={tActions("edit")}
                span="full"
                required
                requiredMessage={t("validation.type")}
                onSaveValues={(next) =>
                  patchField({
                    vendor_types: next.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0),
                  })
                }
              >
                {typeRows.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {typeRows.map((row) => (
                      <VendorTypeChip key={row.id} row={row} />
                    ))}
                  </span>
                ) : null}
              </DetailEditableField>
            ) : (
              <DetailMetricCard label={t("fields.type")}>
                {typeRows.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {typeRows.map((row) => (
                      <VendorTypeChip key={row.id} row={row} />
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </DetailMetricCard>
            )}
            <DetailEditableField
              label={t("fields.email")}
              value={detail.email}
              kind="email"
              required
              requiredMessage={t("validation.email")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ email: next })}
            >
              {detail.email}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.phone")}
              value={detail.phone ?? ""}
              kind="tel"
              required
              requiredMessage={t("validation.phoneInvalid")}
              editAriaLabel={tActions("edit")}
              empty={t("detail.notProvided")}
              onSave={(next) => patchField({ phone: next })}
            >
              {detail.phone?.trim() ? detail.phone : null}
            </DetailEditableField>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("fields.addresses")}>
          {addresses.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>
          ) : (
            <div className="space-y-4 overflow-visible">
              {sortedAddresses.map(({ address: addr, originalIndex, displayIndex }) => (
                <DetailEntityAddressFields
                  key={addr.id ?? originalIndex}
                  separated={displayIndex > 0}
                  blockHeading={t("addresses.rowLabel", { index: displayIndex + 1 })}
                  address={addr}
                  addressIndex={originalIndex}
                  allAddresses={addresses}
                  labels={addressFieldLabels}
                  requiredMessages={addressRequiredMessages}
                  addressTypeOptions={addressTypeOptions}
                  addressTypeValue={t(`addressType.${addr.address_type ?? "other"}`)}
                  editAriaLabel={tActions("edit")}
                  onSaveAddresses={patchAddresses}
                />
              ))}
            </div>
          )}
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
