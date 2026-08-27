"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { cn } from "@/core/utils/http.util";
import { useRouter } from "@/i18n/navigation";
import {
  createRole,
  fetchRoleDetail,
  fetchRolesList,
  updateRole,
} from "@/features/settings/roles/api/role.api";
import {
  createRoleFormSchema,
  emptyRoleFormDefaults,
  mapRoleFormToPayload,
  roleToFormDefaults,
  type RoleFormValues,
} from "@/features/settings/roles/schemas/role-form-schema";
import type { Role } from "@/features/settings/roles/types/role.types";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { routes } from "@/shared/config/routes";
import {
  AppButton,
  CheckmarkSelect,
  dashboardScrollablePageClassName,
  FieldGroup,
  FormFieldRow,
  SurfaceShell,
  SurfaceTextareaField,
  SurfaceTextField,
  type CheckmarkSelectOption,
} from "@/shared/ui";

export type RoleFormProps = {
  mode?: "create" | "edit";
  roleId?: number;
};

export function RoleFormScreen({ mode = "create", roleId }: RoleFormProps) {
  const t = useTranslations("Dashboard.roles");
  const router = useRouter();
  const safeBack = useFormBackUrl("settings/roles", routes.dashboard.settingsRoles ?? "/settings/roles");
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = React.useState<Role[]>([]);

  const schema = React.useMemo(
    () =>
      createRoleFormSchema({
        roleNameRequired: t("validation.roleName"),
      }),
    [t],
  );

  const {
    control,
    register,
    reset,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyRoleFormDefaults(),
  });

  // Fetch parent role candidates (exclude self when editing)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const roles = await fetchRolesList();
        if (!cancelled) {
          setAvailableRoles(roles);
        }
      } catch {
        if (!cancelled) setAvailableRoles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch existing role data if in edit mode
  React.useEffect(() => {
    if (!isEdit || !roleId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchRoleDetail(roleId);
        if (!cancelled) {
          reset(roleToFormDefaults(row));
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
  }, [isEdit, roleId, reset, t]);

  const parentRoleOptions = React.useMemo<CheckmarkSelectOption[]>(() => {
    const opts: CheckmarkSelectOption[] = [
      { value: "", label: t("placeholders.none") },
    ];
    availableRoles
      .filter((r) => !roleId || r.id !== roleId)
      .forEach((r) => {
        const label = r.role_name?.trim() || r.name?.trim() || `Role #${r.id}`;
        opts.push({ value: String(r.id), label });
      });
    return opts;
  }, [availableRoles, roleId, t]);

  const onSubmit: SubmitHandler<RoleFormValues> = async (values) => {
    setSaving(true);
    try {
      const payload = mapRoleFormToPayload(values);
      const targetBack = safeBack ?? routes.dashboard.settingsRoles ?? "/settings/roles";

      if (isEdit && roleId) {
        await updateRole(roleId, payload);
        toastSuccess(t("updatedToast"));
        router.replace(targetBack);
      } else {
        await createRole(payload);
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
              onClick={() => router.push(safeBack ?? routes.dashboard.settingsRoles ?? "/settings/roles")}
            >
              {t("modal.cancel")}
            </AppButton>
            <AppButton
              type="submit"
              form="role-upsert-form"
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
            id="role-upsert-form"
            className="w-full max-w-none space-y-6 p-4 sm:p-6 lg:p-8"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Row 1: role_name & parent_role */}
            <FormFieldRow cols="2">
              <SurfaceTextField
                register={register}
                name="role_name"
                id="role-name"
                label={t("fields.roleName")}
                required
                error={errors.role_name?.message}
                placeholder={t("placeholders.roleName")}
                disabled={saving}
              />

              <FieldGroup label={t("fields.parentRole")} htmlFor="role-parent">
                <Controller
                  control={control}
                  name="parent_role"
                  render={({ field }) => (
                    <CheckmarkSelect
                      listLabel={t("fields.parentRole")}
                      options={parentRoleOptions}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={saving}
                      className="w-full"
                    />
                  )}
                />
              </FieldGroup>
            </FormFieldRow>

            {/* Row 2: description & shared_data_with_peers */}
            <FormFieldRow cols="2">
              <SurfaceTextareaField
                register={register}
                name="description"
                id="role-description"
                label={t("fields.description")}
                error={errors.description?.message}
                placeholder={t("placeholders.description")}
                rows={4}
                disabled={saving}
              />

              <FieldGroup label={t("fields.sharedDataWithPeers")} htmlFor="role-shared-peers">
                <Controller
                  control={control}
                  name="shared_data_with_peers"
                  render={({ field }) => (
                    <div className="flex h-[var(--form-control-height,2.5rem)] items-center">
                      <button
                        id="role-shared-peers"
                        type="button"
                        role="switch"
                        aria-checked={field.value}
                        aria-label={t("fields.sharedDataWithPeers")}
                        disabled={saving}
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:opacity-50",
                          field.value ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-200 dark:bg-slate-700",
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-slate-900",
                            field.value ? "translate-x-5" : "translate-x-0",
                          )}
                        />
                      </button>
                    </div>
                  )}
                />
              </FieldGroup>
            </FormFieldRow>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}

export const CreateRoleForm = RoleFormScreen;