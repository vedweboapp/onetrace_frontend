"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { fetchRoles, fetchUserProfile, inviteUser, updateUserProfile } from "@/features/users/api/user.api";
import { createUserFormSchema, type UserFormValues } from "@/features/users/schemas/user-form-schema";
import { emptyUserFormDefaults, mapInviteUserFormToPayload, mapUserFormToUpdatePayload, userToFormDefaults } from "@/features/users/utils/user-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import {
  AppButton,
  CascadingLocationFields,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  SurfacePhoneField,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

export function UserFormScreen({ mode, userId }: { mode: "create" | "edit"; userId?: number }) {
  const t = useTranslations("Dashboard.users");
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "settings/users");
  const isEdit = mode === "edit";
  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [roleOptions, setRoleOptions] = React.useState<{ value: string; label: string }[]>([]);

  const schema = React.useMemo(() => createUserFormSchema({
    firstName: t("validation.firstName"),
    lastName: t("validation.lastName"),
    email: t("validation.email"),
    phone: t("validation.phone"),
    gender: t("validation.gender"),
    role: t("validation.role"),
    country: t("validation.country"),
    state: t("validation.state"),
    city: t("validation.city"),
    pincode: t("validation.pincode"),
  }), [t]);

  const { control, register, reset, setValue, handleSubmit, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyUserFormDefaults(),
  });

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
      if (isEdit && userId) {
        await updateUserProfile(userId, mapUserFormToUpdatePayload(values));
        toastSuccess(t("updatedToast"));
      } else {
        await inviteUser(mapInviteUserFormToPayload(values));
        toastSuccess(t("createdToast"));
      }
      router.replace(safeBack);
    } catch {
      toastError(t("saveError"));
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
        actions={<div className="flex items-center gap-2"><AppButton type="button" variant="secondary" size="md" disabled={saving} onClick={() => router.push(safeBack)}>{t("modal.cancel")}</AppButton><AppButton type="submit" form="user-upsert-screen-form" variant="primary" size="md" loading={saving}>{isEdit ? t("modal.saveChanges") : t("modal.save")}</AppButton></div>}
      />
      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loadingExisting ? (
          <div className="space-y-3 p-4 sm:p-6"><div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
        ) : screenError ? (
          <div className="space-y-4 p-4 sm:p-6"><p className="text-sm text-red-600 dark:text-red-400">{screenError}</p></div>
        ) : (
          <form id="user-upsert-screen-form" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
            <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
              <FieldGroup label={t("fields.firstName")} htmlFor="user-first-name" required>
                <input id="user-first-name" aria-invalid={errors.first_name ? true : undefined} className={cn(surfaceInputClassName, errors.first_name && "border-red-500 dark:border-red-500")} {...register("first_name", { onChange: (e) => { e.target.value = capitalizeFirstLetter(e.target.value); } })} />
                <FieldErrorText>{errors.first_name?.message}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={t("fields.lastName")} htmlFor="user-last-name" required>
                <input id="user-last-name" aria-invalid={errors.last_name ? true : undefined} className={cn(surfaceInputClassName, errors.last_name && "border-red-500 dark:border-red-500")} {...register("last_name", { onChange: (e) => { e.target.value = capitalizeFirstLetter(e.target.value); } })} />
                <FieldErrorText>{errors.last_name?.message}</FieldErrorText>
              </FieldGroup>
            </FormFieldRow>
            <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
              <FieldGroup label={t("fields.email")} htmlFor="user-email" required>
                <input id="user-email" type="email" aria-invalid={errors.email ? true : undefined} className={cn(surfaceInputClassName, errors.email && "border-red-500 dark:border-red-500")} {...register("email")} />
                <FieldErrorText>{errors.email?.message}</FieldErrorText>
              </FieldGroup>
              <SurfacePhoneField
                control={control}
                name="phone_number"
                id="user-phone"
                label={t("fields.phone")}
                required
                error={errors.phone_number?.message}
                disabled={saving}
              />
            </FormFieldRow>
            <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
              <FieldGroup label={t("fields.gender")} htmlFor="user-gender" required>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <CheckmarkSelect id="user-gender" listLabel={t("fields.gender")} options={[{ value: "Male", label: t("genders.male") }, { value: "Female", label: t("genders.female") }, { value: "Other", label: t("genders.other") }]} value={field.value} emptyLabel={t("placeholders.gender")} disabled={saving} invalid={!!errors.gender} onBlur={field.onBlur} onChange={field.onChange} />
                  )}
                />
                <FieldErrorText>{errors.gender?.message}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={t("fields.role")} htmlFor="user-role" required>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <CheckmarkSelect id="user-role" listLabel={t("fields.role")} options={roleOptions} value={field.value} emptyLabel={t("placeholders.role")} disabled={saving || roleOptions.length === 0} invalid={!!errors.role} onBlur={field.onBlur} onChange={field.onChange} />
                  )}
                />
                <FieldErrorText>{errors.role?.message}</FieldErrorText>
              </FieldGroup>
            </FormFieldRow>
            <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
              <FieldGroup label={t("fields.address1")} htmlFor="user-address1"><input id="user-address1" className={surfaceInputClassName} {...register("address1")} /></FieldGroup>
              <FieldGroup label={t("fields.address2")} htmlFor="user-address2"><input id="user-address2" className={surfaceInputClassName} {...register("address2")} /></FieldGroup>
            </FormFieldRow>
            <CascadingLocationFields<UserFormValues>
              control={control}
              setValue={setValue}
              countryIsoName="country_iso"
              stateIsoName="state_iso"
              cityName="city"
              labels={{
                country: t("fields.country"),
                state: t("fields.state"),
                city: t("fields.city"),
              }}
              placeholders={{
                country: t("placeholders.country"),
                state: t("placeholders.state"),
                city: t("placeholders.city"),
              }}
              disabled={saving}
              errors={{
                country: errors.country_iso?.message,
                state: errors.state_iso?.message,
                city: errors.city?.message,
              }}
              trailingSlot={
                <FieldGroup label={t("fields.pincode")} htmlFor="user-pincode" required>
                  <input
                    id="user-pincode"
                    aria-invalid={errors.pincode ? true : undefined}
                    aria-describedby={errors.pincode ? "user-pincode-err" : undefined}
                    className={cn(surfaceInputClassName, errors.pincode && "border-red-500 dark:border-red-500")}
                    {...register("pincode")}
                  />
                  <FieldErrorText id="user-pincode-err">{errors.pincode?.message}</FieldErrorText>
                </FieldGroup>
              }
            />
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
