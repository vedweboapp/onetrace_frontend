"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { fetchVendorTypesPage } from "@/features/vendor-types/api/vendor-type.api";
import { updateVendor } from "@/features/vendors/api/vendor.api";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import { VendorTypeChip } from "@/features/vendor-types/components/vendor-type-chip";
import { getVendorTypeId, getVendorTypeRow, parseVendorCoord } from "@/features/vendors/utils/vendor-nested-fields.util";
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
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { ActiveStatusBadge } from "@/shared/ui";

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
  const typeRow = getVendorTypeRow(detail);
  const typeId = getVendorTypeId(detail);
  const addresses = detail.addresses ?? [];
  const [vendorTypeOptions, setVendorTypeOptions] = React.useState<{ value: string; label: string }[]>([]);

  const statusOptions = React.useMemo(
    () => [
      { value: "true", label: t("status.active") },
      { value: "false", label: t("status.inactive") },
    ],
    [t],
  );

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

  async function patchField(body: Parameters<typeof updateVendor>[1]) {
    try {
      await updateVendor(detail.id, body);
      toastSuccess(t("updatedToast"));
      onSaved?.();
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
      throw error;
    }
  }

  async function patchAddresses(addressPayloads: Parameters<typeof updateVendor>[1]["addresses"]) {
    try {
      await updateVendor(detail.id, { addresses: addressPayloads ?? [] });
      toastSuccess(t("updatedToast"));
      onSaved?.();
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
      throw error;
    }
  }

  const addressFieldLabels = React.useMemo(
    () => ({
      addressLine1: t("fields.addressLine1"),
      addressLine2: t("fields.addressLine2"),
      pincode: t("fields.pincode"),
      country: t("fields.country"),
      state: t("fields.stateProvince"),
      city: t("fields.city"),
    }),
    [t],
  );

  const mapPoints: AddressMapPoint[] = addresses.map((addr, index) => {
    const lat = parseVendorCoord(addr.latitude);
    const lon = parseVendorCoord(addr.longitude);
    return {
      id: addr.id ?? index,
      label: addr.is_primary ? t("addresses.primary") : t("addresses.rowLabel", { index: index + 1 }),
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
      <DetailPageMapLayout map={mapNode} mapTitle={t("detail.sectionMap")} showMap>
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid compact>
            <DetailEditableField
              label={t("fields.name")}
              value={detail.name}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ name: next })}
            >
              {detail.name}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.status")}
              value={detail.is_active ? "true" : "false"}
              kind="select"
              options={statusOptions}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ is_active: next === "true" })}
            >
              <ActiveStatusBadge
                active={detail.is_active}
                label={detail.is_active ? t("status.active") : t("status.inactive")}
              />
            </DetailEditableField>
            {vendorTypeOptions.length > 0 ? (
              <DetailEditableField
                label={t("fields.type")}
                value={typeId != null ? String(typeId) : ""}
                kind="select"
                options={vendorTypeOptions}
                editAriaLabel={tActions("edit")}
                onSave={(next) => patchField({ type: Number(next) })}
              >
                {typeRow ? <VendorTypeChip row={typeRow} /> : null}
              </DetailEditableField>
            ) : (
              <DetailMetricCard label={t("fields.type")}>
                {typeRow ? <VendorTypeChip row={typeRow} /> : "—"}
              </DetailMetricCard>
            )}
            <DetailEditableField
              label={t("fields.email")}
              value={detail.email}
              kind="email"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ email: next })}
            >
              {detail.email}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.phone")}
              value={detail.phone ?? ""}
              kind="tel"
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
            <ul className="space-y-4">
              {addresses.map((addr, index) => (
                <li
                  key={addr.id ?? index}
                  className="rounded-lg border border-slate-100 p-4 dark:border-slate-800"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {t(`addressType.${addr.address_type ?? "other"}`)}
                    </span>
                    {addr.is_primary ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t("addresses.primary")}
                      </span>
                    ) : null}
                  </div>
                  <DetailEntityAddressFields
                    address={addr}
                    addressIndex={index}
                    allAddresses={addresses}
                    labels={addressFieldLabels}
                    editAriaLabel={tActions("edit")}
                    onSaveAddresses={patchAddresses}
                  />
                </li>
              ))}
            </ul>
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
