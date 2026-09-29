"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import {
  createProfile,
  fetchProfileDetail,
  updateProfile,
} from "@/features/settings/profiles/api/profile.api";
import {
  createProfileFormSchema,
  emptyProfileFormDefaults,
  mapProfileFormToPayload,
  profileToFormDefaults,
  type ProfileFormValues,
} from "@/features/settings/profiles/schemas/profile-form-schema";
import { fetchRoles } from "@/features/users/api/user.api";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { routes } from "@/shared/config/routes";
import {
  AppButton,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  SurfaceShell,
  SurfaceTextareaField,
  SurfaceTextField,
  dashboardScrollablePageClassName,
} from "@/shared/ui";

export type ProfileFormProps = {
  mode?: "create" | "edit";
  profileId?: number;
};

export function ProfileFormScreen({ mode = "create", profileId }: ProfileFormProps) {
  const t = useTranslations("Dashboard.profiles");
  const router = useRouter();
  const safeBack = useFormBackUrl("settings/profiles", routes.dashboard.settingsProfiles ?? "/settings/profiles");
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [roleOptions, setRoleOptions] = React.useState<{ value: string; label: string }[]>([]);

  const schema = React.useMemo(
    () =>
      createProfileFormSchema({
        profileNameRequired: t("validation.profileName"),
        roleRequired: t("validation.role"),
      }),
    [t],
  );

  const {
    register,
    control,
    reset,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyProfileFormDefaults(),
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
    if (!isEdit || !profileId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchProfileDetail(profileId);
        if (!cancelled) {
          reset(profileToFormDefaults(row));
        }
      } catch {
        if (!cancelled) setScreenError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, profileId, reset, t]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (values) => {
    setSaving(true);
    try {
      const payload = mapProfileFormToPayload(values);
      const targetBack = safeBack ?? routes.dashboard.settingsProfiles ?? "/settings/profiles";

      if (isEdit && profileId) {
        await updateProfile(profileId, payload);
        toastSuccess(t("updatedToast"));
        router.replace(targetBack);
      } else {
        await createProfile(payload);
        toastSuccess(t("createdToast"));
        router.replace(targetBack);
      }
    } catch (error) {
      reportFormSubmitApiError(error, setError, t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={dashboardScrollablePageClassName()}>
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
              onClick={() => router.push(safeBack ?? routes.dashboard.settingsProfiles ?? "/settings/profiles")}
            >
              {t("modal.cancel")}
            </AppButton>
            <AppButton
              type="submit"
              form="profile-upsert-form"
              variant="primary"
              size="sm"
              loading={saving}
            >
              {isEdit ? t("modal.saveChanges") : t("modal.save")}
            </AppButton>
          </div>
        }
      />

      <SurfaceShell className="rounded-none border border-slate-200 shadow-none ring-0 dark:border-slate-800">
        {loadingExisting ? (
          <div className="space-y-4 p-4 sm:p-6 lg:p-8">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : screenError ? (
          <div className="p-4 sm:p-6 lg:p-8">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{screenError}</p>
          </div>
        ) : (
          <form
            id="profile-upsert-form"
            className="w-full max-w-none space-y-6 p-4 sm:p-6 lg:p-8"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            <FormFieldRow cols="2">
              <SurfaceTextField
                register={register}
                name="profile_name"
                id="profile-name"
                label={t("fields.profileName")}
                required
                error={errors.profile_name?.message}
                placeholder={t("placeholders.profileName")}
                disabled={saving}
              />

              <FieldGroup label={t("fields.role")} htmlFor="profile-role" required>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <CheckmarkSelect
                      id="profile-role"
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

            <FormFieldRow cols="2">
              <SurfaceTextField
                register={register}
                name="profile_type"
                id="profile-type"
                label={t("fields.profileType")}
                error={errors.profile_type?.message}
                placeholder={t("placeholders.profileType")}
                disabled={saving}
              />
            </FormFieldRow>

            <FormFieldRow cols="2">
              <SurfaceTextareaField
                register={register}
                name="description"
                id="profile-description"
                label={t("fields.description")}
                error={errors.description?.message}
                placeholder={t("placeholders.description")}
                rows={4}
                disabled={saving}
              />
            </FormFieldRow>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}

export const CreateProfileForm = ProfileFormScreen;
