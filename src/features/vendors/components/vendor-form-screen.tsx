"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { fetchVendorTypesPage } from "@/features/vendor-types/api/vendor-type.api";
import { createVendor, fetchVendor, updateVendor } from "@/features/vendors/api/vendor.api";
import { EntityAddressesFields } from "@/shared/components/form/entity-addresses-fields";
import { usePhoneCountryFromAddresses } from "@/shared/hooks/use-phone-country-from-address";
import { createVendorFormSchema, type VendorFormValues } from "@/features/vendors/schemas/vendor-form-schema";
import {
  emptyVendorFormDefaults,
  mapVendorFormToPayload,
  vendorToFormDefaults,
} from "@/features/vendors/utils/vendor-form-map";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { useSettingsQuickAdd } from "@/shared/hooks/use-quick-create";
import {
  hrefAfterEntityCreate,
  QUICK_CREATE_SELECT_TARGET_PARAM,
  resolveFormBackUrl,
} from "@/shared/utils/quick-create-navigation.util";
import {
  AppButton,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  SurfacePhoneField,
  SurfaceTextField,
  SurfaceShell,
  dashboardScrollablePageClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  vendorId?: number;
};

export function VendorFormScreen({ mode, vendorId }: Props) {
  const t = useTranslations("Dashboard.vendors");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listHref = React.useMemo(() => {
    const needle = routes.dashboard.vendors;
    const i = pathname.indexOf(needle);
    return i >= 0 ? pathname.slice(0, i + needle.length) : needle;
  }, [pathname]);
  const safeBack = useFormBackUrl("vendors", listHref);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [typeOptions, setTypeOptions] = React.useState<Array<{ value: string; label: string }>>([]);

  const schema = React.useMemo(
    () =>
      createVendorFormSchema({
        name: t("validation.name"),
        email: t("validation.email"),
        phoneInvalid: t("validation.phoneInvalid"),
        type: t("validation.type"),
        addressLine1: t("validation.addressLine1"),
        country: t("validation.country"),
        state: t("validation.state"),
        city: t("validation.city"),
        pincode: t("validation.pincode"),
        addressType: t("validation.addressType"),
        addressesMin: t("validation.addressesMin"),
      }),
    [t],
  );

  const {
    control,
    register,
    reset,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyVendorFormDefaults(),
  });

  const phoneCountry = usePhoneCountryFromAddresses(control);
  const tQuick = useTranslations("Dashboard.quickCreate");
  const vendorTypeQuickAdd = useSettingsQuickAdd({
    href: routes.dashboard.settingsVendorTypes,
    addLabel: tQuick("add.vendorType"),
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchVendorTypesPage(1, 100, { is_active: true });
        if (!cancelled) {
          setTypeOptions(items.map((row) => ({ value: String(row.id), label: row.name })));
        }
      } catch {
        if (!cancelled) setTypeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isEdit || !vendorId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchVendor(vendorId);
        if (!cancelled) reset(vendorToFormDefaults(row));
      } catch {
        if (!cancelled) setScreenError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId, isEdit, reset, t]);

  async function submit(values: VendorFormValues) {
    const payload = mapVendorFormToPayload(values);
    setSaving(true);
    try {
      const saved = isEdit && vendorId ? await updateVendor(vendorId, payload) : await createVendor(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(
        hrefAfterEntityCreate({
          createdId: saved.id,
          selectTarget: isEdit ? null : searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM),
          backHref: safeBack,
          listPath: routes.dashboard.vendors,
        }),
      );
    } catch (error) {
      reportFormSubmitApiError(error, setError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={dashboardScrollablePageClassName()}>
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(safeBack)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="vendor-upsert-screen-form" variant="primary" size="sm" loading={saving}>
              {isEdit ? t("modal.saveChanges") : t("modal.save")}
            </AppButton>
          </div>
        }
      />

      <SurfaceShell className="rounded-none border border-slate-200 shadow-none ring-0 dark:border-slate-800">
        {loadingExisting ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : screenError ? (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{screenError}</p>
          </div>
        ) : (
          <form
            id="vendor-upsert-screen-form"
            className="w-full max-w-none space-y-6 p-4 sm:p-6 lg:p-8"
            noValidate
            onSubmit={handleSubmit(submit)}
          >
            <FormFieldRow cols="2">
              <SurfaceTextField
                register={register}
                name="name"
                id="vendor-name"
                label={t("fields.name")}
                kind="companyName"
                required
                autoComplete="name"
                error={errors.name?.message}
              />

              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <FieldGroup label={t("fields.type")} htmlFor="vendor-type" required>
                    <CheckmarkSelect
                      id="vendor-type"
                      options={typeOptions}
                      value={field.value}
                      onChange={field.onChange}
                      emptyLabel={t("placeholders.type")}
                      disabled={saving || typeOptions.length === 0}
                      invalid={!!errors.type}
                      listLabel={t("fields.type")}
                      portaled
                      onAdd={vendorTypeQuickAdd.onAdd}
                      addAriaLabel={vendorTypeQuickAdd.addAriaLabel}
                      addLabel={vendorTypeQuickAdd.addLabel}
                    />
                    <FieldErrorText>{errors.type?.message}</FieldErrorText>
                  </FieldGroup>
                )}
              />
            </FormFieldRow>

            <FormFieldRow cols="2">
              <SurfaceTextField
                register={register}
                name="email"
                id="vendor-email"
                label={t("fields.email")}
                kind="email"
                required
                autoComplete="email"
                error={errors.email?.message}
              />
              <SurfacePhoneField
                control={control}
                name="phone"
                id="vendor-phone"
                label={t("fields.phone")}
                required
                error={errors.phone?.message}
                disabled={saving}
                countryIso={phoneCountry}
              />
            </FormFieldRow>

            <EntityAddressesFields
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              disabled={saving}
              idPrefix="vendor-address"
              includeGeo
              labels={{
                sectionTitle: t("fields.addresses"),
                add: t("addresses.add"),
                remove: t("addresses.remove"),
                primary: t("addresses.primary"),
                rowLabel: (index) => t("addresses.rowLabel", { index }),
                addressType: t("fields.addressType"),
                addressLine1: t("fields.addressLine1"),
                addressLine2: t("fields.addressLine2"),
                country: t("fields.country"),
                state: t("fields.stateProvince"),
                city: t("fields.city"),
                pincode: t("fields.pincode"),
                countryPlaceholder: t("placeholders.country"),
                statePlaceholder: t("placeholders.state"),
                cityPlaceholder: t("placeholders.city"),
                addressTypeBilling: t("addressType.billing"),
                addressTypeShipping: t("addressType.shipping"),
                addressTypeOther: t("addressType.other"),
              }}
            />
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
