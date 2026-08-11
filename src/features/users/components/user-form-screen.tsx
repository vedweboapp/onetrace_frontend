"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { usePhoneCountryFromAddresses } from "@/shared/hooks/use-phone-country-from-address";
import { fetchRoles, fetchUserProfile, inviteUser, updateUserProfile } from "@/features/users/api/user.api";
import { createUserFormSchema, type UserFormValues } from "@/features/users/schemas/user-form-schema";
import {
  emptyUserFormDefaults,
  mapInviteUserFormToPayload,
  mapUserFormToUpdatePayload,
  userToFormDefaults,
} from "@/features/users/utils/user-form-map";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { EntityAddressesFields } from "@/shared/components/form/entity-addresses-fields";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import {
  AppButton,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  InputWithEndSelect,
  SurfacePhoneField,
  SurfaceTextField,
  SurfaceShell,
  type InputWithEndSelectOption,
} from "@/shared/ui";

export function UserFormScreen({ mode, userId }: { mode: "create" | "edit"; userId?: number }) {
  const t = useTranslations("Dashboard.users");
  const router = useRouter();
  const safeBack = useFormBackUrl("settings/users", routes.dashboard.settingsUsers);
  const isEdit = mode === "edit";
  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [roleOptions, setRoleOptions] = React.useState<{ value: string; label: string }[]>([]);

  const schema = React.useMemo(
    () =>
      createUserFormSchema({
        firstName: t("validation.firstName"),
        lastName: t("validation.lastName"),
        email: t("validation.email"),
        phone: t("validation.phone"),
        gender: t("validation.gender"),
        role: t("validation.role"),
        basePay: t("validation.basePay"),
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
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyUserFormDefaults(),
  });

  const phoneCountry = usePhoneCountryFromAddresses(control);

  const basePayTypeOptions = React.useMemo<InputWithEndSelectOption[]>(
    () => [
      { value: "fixed_amount", label: t("fields.basePayTypeFixed") },
      { value: "rate_per_hr", label: t("fields.basePayTypeRate") },
    ],
    [t],
  );

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
    if (!isEdit || !userId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchUserProfile(userId);
        if (!cancelled) reset(userToFormDefaults(row));
      } catch {
        if (!cancelled) setScreenError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, reset, t, userId]);

  async function submit(values: UserFormValues) {
    setSaving(true);
    try {
      const listBack = safeBack ?? routes.dashboard.settingsUsers;
      if (isEdit && userId) {
        await updateUserProfile(userId, mapUserFormToUpdatePayload(values));
        toastSuccess(t("updatedToast"));
        router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.settingsUsers, userId, listBack));
      } else {
        const created = await inviteUser(mapInviteUserFormToPayload(values));
        toastSuccess(t("createdToast"));
        router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.settingsUsers, created.id, listBack));
      }
    } catch (error) {
      reportFormSubmitApiError(error, setError, t("saveError"), {
        fieldMap: {
          address1: "addresses.0.address_line_1",
          address2: "addresses.0.address_line_2",
          country: "addresses.0.country_iso",
          state: "addresses.0.state_iso",
          city: "addresses.0.city",
          pincode: "addresses.0.pincode",
        },
      });
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
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => router.push(safeBack ?? routes.dashboard.settingsUsers)}
            >
              {t("modal.cancel")}
            </AppButton>
            <AppButton
              type="submit"
              form="user-upsert-screen-form"
              variant="primary"
              size="sm"
              loading={saving}
            >
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
          <form
            id="user-upsert-screen-form"
            className="space-y-6 p-4 sm:p-6"
            noValidate
            onSubmit={handleSubmit(submit)}
          >
            <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
              <SurfaceTextField
                register={register}
                name="first_name"
                id="user-first-name"
                label={t("fields.firstName")}
                kind="name"
                required
                autoComplete="given-name"
                error={errors.first_name?.message}
              />
              <SurfaceTextField
                register={register}
                name="last_name"
                id="user-last-name"
                label={t("fields.lastName")}
                kind="name"
                required
                autoComplete="family-name"
                error={errors.last_name?.message}
              />
            </FormFieldRow>
            <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
              <SurfaceTextField
                register={register}
                name="email"
                id="user-email"
                label={t("fields.email")}
                kind="email"
                required
                autoComplete="email"
                error={errors.email?.message}
              />
              <SurfacePhoneField
                control={control}
                name="phone_number"
                id="user-phone"
                label={t("fields.phone")}
                required
                error={errors.phone_number?.message}
                disabled={saving}
                countryIso={phoneCountry}
              />
            </FormFieldRow>
            <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
              <FieldGroup label={t("fields.gender")} htmlFor="user-gender" required>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <CheckmarkSelect
                      id="user-gender"
                      listLabel={t("fields.gender")}
                      options={[
                        { value: "Male", label: t("genders.male") },
                        { value: "Female", label: t("genders.female") },
                        { value: "Other", label: t("genders.other") },
                      ]}
                      value={field.value}
                      emptyLabel={t("placeholders.gender")}
                      disabled={saving}
                      invalid={!!errors.gender}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FieldErrorText>{errors.gender?.message}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={t("fields.role")} htmlFor="user-role" required>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <CheckmarkSelect
                      id="user-role"
                      listLabel={t("fields.role")}
                      options={roleOptions}
                      value={field.value}
                      emptyLabel={t("placeholders.role")}
                      disabled={saving || roleOptions.length === 0}
                      invalid={!!errors.role}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FieldErrorText>{errors.role?.message}</FieldErrorText>
              </FieldGroup>
            </FormFieldRow>

            <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
              <FieldGroup label={t("fields.basePay")} htmlFor="user-base-pay">
                <Controller
                  control={control}
                  name="base_pay"
                  render={({ field: payField }) => (
                    <Controller
                      control={control}
                      name="base_pay_type"
                      render={({ field: typeField }) => (
                        <InputWithEndSelect
                          inputId="user-base-pay"
                          inputType="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          inputValue={payField.value}
                          onInputChange={payField.onChange}
                          placeholder={t("placeholders.basePay")}
                          disabled={saving}
                          selectValue={typeField.value}
                          onSelectChange={(v) =>
                            typeField.onChange(v === "rate_per_hr" ? "rate_per_hr" : "fixed_amount")
                          }
                          selectOptions={basePayTypeOptions}
                          selectAriaLabel={t("fields.basePayType")}
                        />
                      )}
                    />
                  )}
                />
                <FieldErrorText>{errors.base_pay?.message}</FieldErrorText>
              </FieldGroup>
            </FormFieldRow>

            <EntityAddressesFields
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              disabled={saving}
              idPrefix="user-address"
              includeGeo={false}
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
                state: t("fields.state"),
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
