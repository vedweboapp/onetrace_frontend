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
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import {
  AppButton,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  SurfacePhoneField,
  SurfaceShell,
  surfaceInputClassName,
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
      router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.vendors, saved.id, safeBack));
    } catch (error) {
      reportFormSubmitApiError(error, setError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-12">
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

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
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
          <form id="vendor-upsert-screen-form" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
            <FormFieldRow cols="2">
              <FieldGroup label={t("fields.name")} htmlFor="vendor-name" required>
                <input
                  id="vendor-name"
                  className={cn(surfaceInputClassName, errors.name && "border-red-500")}
                  {...register("name", {
                    onChange: (e) => {
                      e.target.value = capitalizeFirstLetter(e.target.value);
                    },
                  })}
                />
                <FieldErrorText>{errors.name?.message}</FieldErrorText>
              </FieldGroup>

              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <FieldGroup label={t("fields.type")} htmlFor="vendor-type">
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
                    />
                    <FieldErrorText>{errors.type?.message}</FieldErrorText>
                  </FieldGroup>
                )}
              />
            </FormFieldRow>

            <FormFieldRow cols="2">
              <FieldGroup label={t("fields.email")} htmlFor="vendor-email" required>
                <input
                  id="vendor-email"
                  type="email"
                  className={cn(surfaceInputClassName, errors.email && "border-red-500")}
                  {...register("email")}
                />
                <FieldErrorText>{errors.email?.message}</FieldErrorText>
              </FieldGroup>
              <SurfacePhoneField
                control={control}
                name="phone"
                id="vendor-phone"
                label={t("fields.phone")}
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
