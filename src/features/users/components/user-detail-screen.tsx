"use client";

import * as React from "react";
import { Suspense } from "react";
import { Mail, Phone, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchRoles, fetchUserProfile, updateUserProfile } from "@/features/users/api/user.api";
import type { UserProfile } from "@/features/users/types/user.types";
import { resolveUserAddresses } from "@/features/users/utils/user-form-map";
import { normalizeUserAvailabilityFromApi } from "@/features/users/utils/user-availability.util";
import { SchedulingPanel } from "@/features/scheduling/components/scheduling-panel";
import { routes } from "@/shared/config/routes";
import { DetailSystemMetadataSection, EntityDetailLoadingSkeleton } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailEntityAddressFields } from "@/shared/components/layout/detail-entity-address-fields";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";
import {
  detailRecordInnerClassName,
  detailRecordSurfaceShellClassName,
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { useEntityDetailBack } from "@/shared/hooks/use-entity-detail-back";
import { formatSettingsDetailDate } from "@/shared/components/settings/settings-detail-view";
import {
  buildCurrentPageBackHref,
  buildPathWithStoredBack,
} from "@/shared/utils/detail-from-list.util";
import { entityAddressTypeOptions, sortEntityAddressesForDisplay } from "@/shared/form/entity-address-form.util";
import { AppButton, AppTabs, EditButton, SurfaceShell, type AppTabItem, type CheckmarkSelectOption } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { parseOrgMoneyInput } from "@/shared/money/format-money.util";
import { getOrgCurrencySettings } from "@/shared/money/org-currency.store";
import { useOrgCurrency } from "@/shared/money/use-org-currency";

function userRoleLabel(row: UserProfile | null): string {
  if (!row?.role_detail) return "—";
  return row.role_detail.role_name?.trim() || row.role_detail.name?.trim() || "—";
}

function resolveBasePay(row: UserProfile): string {
  if (row.base_pay != null && String(row.base_pay).trim() !== "") return String(row.base_pay);
  const fromDetail = (row.user_detail as { base_pay?: unknown })?.base_pay;
  if (fromDetail != null && String(fromDetail).trim() !== "") return String(fromDetail);
  return "";
}

function resolveBasePayType(row: UserProfile): "fixed_amount" | "rate_per_hr" {
  const raw =
    row.base_pay_type ??
    (row.user_detail as { base_pay_type?: unknown })?.base_pay_type ??
    null;
  return raw === "rate_per_hr" ? "rate_per_hr" : "fixed_amount";
}

function resolveUserAvailability(row: UserProfile) {
  const source =
    row.available_days ??
    (row.user_detail as { available_days?: UserProfile["available_days"] })?.available_days;
  return normalizeUserAvailabilityFromApi(source ?? null).filter((day) => day.enabled);
}

type UserDetailTabId = "overview" | "scheduling";

function isUserDetailTabId(value: string | null): value is UserDetailTabId {
  return value === "overview" || value === "scheduling";
}

export function UserDetailScreen({ userId }: { userId: number }) {
  const t = useTranslations("Dashboard.users");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
  const { formatMoneyValue } = useOrgCurrency();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = useEntityDetailBack("settings/users", routes.dashboard.settingsUsers);
  const tabFromUrl = searchParams.get("tab");
  const activeTab: UserDetailTabId = isUserDetailTabId(tabFromUrl) ? tabFromUrl : "overview";

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "overview", label: t("detail.tabs.overview") },
      { id: "scheduling", label: t("detail.tabs.scheduling") },
    ],
    [t],
  );

  function handleTabChange(tab: string) {
    if (!isUserDetailTabId(tab)) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    if (tab === "overview") nextParams.delete("tab");
    else nextParams.set("tab", tab);
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const [detail, setDetail] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [roleOptions, setRoleOptions] = React.useState<CheckmarkSelectOption[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const roles = await fetchRoles();
        if (!cancelled) {
          setRoleOptions(
            roles.map((r) => ({
              value: String(r.id),
              label: r.role_name?.trim() || r.name?.trim() || `Role #${r.id}`,
            })),
          );
        }
      } catch {
        if (!cancelled) setRoleOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const genderOptions = React.useMemo<CheckmarkSelectOption[]>(
    () => [
      { value: "Male", label: t("genders.male") },
      { value: "Female", label: t("genders.female") },
      { value: "Other", label: t("genders.other") },
    ],
    [t],
  );

  const payTypeOptions = React.useMemo<CheckmarkSelectOption[]>(
    () => [
      { value: "fixed_amount", label: t("fields.basePayTypeFixed") },
      { value: "rate_per_hr", label: t("fields.basePayTypeRate") },
    ],
    [t],
  );

  function goEdit() {
    router.push(
      buildPathWithStoredBack(
        `${pathname}/edit`,
        buildCurrentPageBackHref(pathname, searchParams),
      ),
    );
  }

  const patchField = useDetailPatch(
    (body: Parameters<typeof updateUserProfile>[1]) => updateUserProfile(userId, body),
    { success: t("updatedToast"), error: t("saveError") },
    () => setRefreshNonce((k) => k + 1),
  );

  const patchAddresses = useDetailPatch(
    (addressPayloads: NonNullable<Parameters<typeof updateUserProfile>[1]["addresses"]>) =>
      updateUserProfile(userId, { addresses: addressPayloads }),
    { success: t("updatedToast"), error: t("saveError") },
    () => setRefreshNonce((k) => k + 1),
  );

  const addresses = detail ? resolveUserAddresses(detail) : [];
  const sortedAddresses = React.useMemo(
    () => sortEntityAddressesForDisplay(addresses),
    [addresses],
  );
  const addressTypeOptions = React.useMemo(() => entityAddressTypeOptions((key) => t(key)), [t]);
  const addressFieldLabels = React.useMemo(
    () => ({
      addressType: t("fields.addressType"),
      addressLine1: t("fields.addressLine1"),
      addressLine2: t("fields.addressLine2"),
      pincode: t("fields.pincode"),
      country: t("fields.country"),
      state: t("fields.state"),
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
  const basePay = detail ? resolveBasePay(detail) : "";
  const basePayType = detail ? resolveBasePayType(detail) : "fixed_amount";
  const availableDays = detail ? resolveUserAvailability(detail) : [];

  return (
    <div className="min-h-0 w-full pb-8 sm:pb-10">
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
                <User className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                {userRoleLabel(detail)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                <a
                  href={`mailto:${detail.user_detail.email}`}
                  className="text-blue-600 underline-offset-2 hover:underline"
                >
                  {detail.user_detail.email}
                </a>
              </span>
              {detail.user_detail.phone_number ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                  {detail.user_detail.phone_number}
                </span>
              ) : null}
            </>
          ) : undefined
        }
        actions={
          !loading && !error && detail ? <EditButton onClick={goEdit} /> : null
        }
        extension={
          <AppTabs
            tabs={detailTabs}
            value={activeTab}
            onValueChange={handleTabChange}
            ariaLabel={t("detail.tabsAria")}
            panelIdPrefix="user-detail-tab"
            className="-mx-1 px-1 sm:-mx-0 sm:px-0"
          />
        }
      />

      {activeTab === "scheduling" ? (
        <div
          className={cn(
            "mt-3 flex min-h-[24rem] flex-col overflow-hidden",
            "h-[calc(100dvh-13rem)] sm:h-[calc(100dvh-12rem)]",
          )}
        >
          <Suspense
            fallback={
              <div className="space-y-2 p-4">
                <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
            }
          >
            <SchedulingPanel fixedWorkerId={userId} syncUrl={false} />
          </Suspense>
        </div>
      ) : (
        <SurfaceShell className={cn(detailRecordSurfaceShellClassName, "mt-3")}>
          <div className={detailRecordInnerClassName}>
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
            <DetailPagePadding className="!px-0 !py-0 sm:!px-0 sm:!py-0">
              <div className={detailPageStackClassName}>
                <DetailPanelCard title={t("detail.sectionOverview")} variant="flat">
                  <DetailMetricsGrid>
                    <DetailEditableField
                      label={t("fields.firstName")}
                      value={detail.user_detail.first_name ?? ""}
                      kind="text"
                      editAriaLabel={tActions("edit")}
                      onSave={(next) => patchField({ user_detail: { first_name: next } })}
                    >
                      {detail.user_detail.first_name || "—"}
                    </DetailEditableField>
                    <DetailEditableField
                      label={t("fields.lastName")}
                      value={detail.user_detail.last_name ?? ""}
                      kind="text"
                      editAriaLabel={tActions("edit")}
                      onSave={(next) => patchField({ user_detail: { last_name: next } })}
                    >
                      {detail.user_detail.last_name || "—"}
                    </DetailEditableField>
                    <DetailEditableField
                      label={t("fields.email")}
                      value={detail.user_detail.email}
                      kind="email"
                      editAriaLabel={tActions("edit")}
                      onSave={(next) => patchField({ user_detail: { email: next } })}
                    >
                      <a
                        href={`mailto:${detail.user_detail.email}`}
                        className="break-all font-medium text-blue-600 underline-offset-2 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {detail.user_detail.email}
                      </a>
                    </DetailEditableField>
                    <DetailEditableField
                      label={t("fields.phone")}
                      value={detail.user_detail.phone_number ?? ""}
                      kind="tel"
                      editAriaLabel={tActions("edit")}
                      onSave={(next) => patchField({ user_detail: { phone_number: next } })}
                    >
                      {detail.user_detail.phone_number || "—"}
                    </DetailEditableField>
                    <DetailEditableField
                      label={t("fields.gender")}
                      value={detail.user_detail.gender ?? ""}
                      kind="select"
                      options={genderOptions}
                      editAriaLabel={tActions("edit")}
                      onSave={(next) => patchField({ user_detail: { gender: next } })}
                    >
                      {detail.user_detail.gender || "—"}
                    </DetailEditableField>
                    <DetailEditableField
                      label={t("fields.role")}
                      value={detail.role_detail?.id ? String(detail.role_detail.id) : ""}
                      kind="select"
                      options={roleOptions}
                      editAriaLabel={tActions("edit")}
                      onSave={(next) => patchField({ role: Number.parseInt(next, 10) })}
                    >
                      {userRoleLabel(detail)}
                    </DetailEditableField>
                    <DetailMetricCard label={t("fields.inviteStatus")}>
                      {detail.user_detail.invite_status || "—"}
                    </DetailMetricCard>
                    <DetailMetricCard label={t("fields.invitationSentAt")}>
                      {formatSettingsDetailDate(dateFmt, detail.user_detail.invitation_sent_at)}
                    </DetailMetricCard>
                  </DetailMetricsGrid>
                </DetailPanelCard>

                <DetailPanelCard title={t("fields.basePay")} variant="flat">
                  <DetailMetricsGrid>
                    <DetailEditableField
                      label={t("fields.basePay")}
                      value={basePay}
                      kind="money"
                      editAriaLabel={tActions("edit")}
                      empty="—"
                      onSave={(next) => {
                        const n = next.trim() ? parseOrgMoneyInput(next, getOrgCurrencySettings()) : null;
                        return patchField({
                          user_detail: {
                            base_pay: n != null && Number.isFinite(n) ? n : null,
                            base_pay_type: n != null && Number.isFinite(n) ? basePayType : null,
                          },
                        });
                      }}
                    >
                      {basePay ? formatMoneyValue(basePay) : "—"}
                    </DetailEditableField>
                    <DetailEditableField
                      label={t("fields.basePayType")}
                      value={basePayType}
                      kind="select"
                      options={payTypeOptions}
                      editAriaLabel={tActions("edit")}
                      onSave={(next) =>
                        patchField({
                          user_detail: {
                            base_pay_type: next === "rate_per_hr" ? "rate_per_hr" : "fixed_amount",
                            ...(basePay.trim() ? { base_pay: Number(basePay) } : {}),
                          },
                        })
                      }
                    >
                      {basePayType === "rate_per_hr"
                        ? t("fields.basePayTypeRate")
                        : t("fields.basePayTypeFixed")}
                    </DetailEditableField>
                  </DetailMetricsGrid>
                </DetailPanelCard>

                {availableDays.length > 0 ? (
                  <DetailPanelCard title={t("fields.availableDays")} variant="flat">
                    <ul className="space-y-2">
                      {availableDays.map((row) => (
                        <li
                          key={row.day}
                          className={cn(
                            "grid w-full max-w-md grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-x-6",
                            "rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800",
                          )}
                        >
                          <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">
                            {t(`availability.days.${row.day}`)}
                          </span>
                          <span className="tabular-nums text-slate-600 dark:text-slate-300">
                            {row.start_time} – {row.end_time}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </DetailPanelCard>
                ) : null}

                <DetailPanelCard title={t("fields.addresses")} variant="flat">
                  {addresses.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("detail.addressUnavailable")}
                    </p>
                  ) : (
                    <div className="space-y-4 overflow-visible">
                      {sortedAddresses.map(({ address: addr, originalIndex, displayIndex }) => (
                        <DetailEntityAddressFields
                          key={addr.id ?? `${addr.address_type}-${originalIndex}`}
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
                          line2Empty={t("detail.addressLine2Empty")}
                          gridFrom="sm"
                          onSaveAddresses={patchAddresses}
                        />
                      ))}
                    </div>
                  )}
                </DetailPanelCard>

                <DetailSystemMetadataSection
                  createdAt={detail.created_at}
                  modifiedAt={null}
                  dateFmt={dateFmt}
                  labels={{
                    sectionTitle: tMeta("systemMetadata"),
                    createdAt: tMeta("createdAt"),
                    updatedAt: tMeta("updatedAt"),
                    createdBy: tMeta("createdBy"),
                    modifiedBy: tMeta("modifiedBy"),
                    notModifiedYet: tMeta("notModifiedYet"),
                  }}
                />
              </div>
            </DetailPagePadding>
          ) : null}
          </div>
        </SurfaceShell>
      )}
    </div>
  );
}
