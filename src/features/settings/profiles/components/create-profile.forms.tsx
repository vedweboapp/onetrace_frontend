"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, type SubmitHandler } from "react-hook-form";
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
import { toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { routes } from "@/shared/config/routes";
import {
  AppButton,
  dashboardScrollablePageClassName,
  FormFieldRow,
  SurfaceShell,
  SurfaceTextareaField,
  SurfaceTextField,
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

  const schema = React.useMemo(
    () =>
      createProfileFormSchema({
        profileNameRequired: t("validation.profileName"),
      }),
    [t],
  );

  const {
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyProfileFormDefaults(),
  });

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
            {/* Row 1: profile_name & profile_type */}
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

            {/* Row 2: description */}
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