"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { z } from "zod";
import { createUserGroup, fetchUserGroup, updateUserGroup } from "@/features/user-groups/api/user-group.api";
import { UserGroupMemberPicker } from "@/features/user-groups/components/user-group-member-picker";
import { formatUserGroupLabel, userGroupMemberIds } from "@/features/user-groups/utils/user-group-display.util";
import { fetchUsersPage } from "@/features/users/api/user.api";
import type { UserProfile } from "@/features/users/types/user.types";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { cn } from "@/core/utils/http.util";
import {
  AppButton,
  FieldErrorText,
  FieldGroup,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

function userOption(row: UserProfile) {
  const first = row.user_detail.first_name?.trim() ?? "";
  const last = row.user_detail.last_name?.trim() ?? "";
  const label = `${first} ${last}`.trim() || row.user_detail.email;
  return { id: row.id, label, subtitle: row.user_detail.email };
}

export function UserGroupFormScreen({ mode, groupId }: { mode: "create" | "edit"; groupId?: number }) {
  const t = useTranslations("Dashboard.userGroups");
  const router = useRouter();
  const safeBack = useFormBackUrl("settings/user-groups", routes.dashboard.settingsUserGroups);
  const isEdit = mode === "edit";

  const [name, setName] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [userOptions, setUserOptions] = React.useState<{ id: number; label: string; subtitle?: string }[]>([]);
  const [usersLoadError, setUsersLoadError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<{ name?: string; users?: string }>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchUsersPage(1, 500);
        if (!cancelled) setUserOptions(items.map(userOption));
      } catch {
        if (!cancelled) setUsersLoadError(t("usersLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  React.useEffect(() => {
    if (!isEdit || groupId == null) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchUserGroup(groupId);
        if (cancelled) return;
        setName(formatUserGroupLabel(row));
        setSelectedIds(userGroupMemberIds(row));
      } catch {
        if (!cancelled) setScreenError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, groupId, t]);

  async function handleSave() {
    const parsed = z
      .object({
        name: zTrimmedNonEmpty(t("validation.name")),
        users: z.array(z.number()).min(1, t("validation.users")),
      })
      .safeParse({ name, users: selectedIds });
    if (!parsed.success) {
      const next: { name?: string; users?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key === "name") next.name = String(issue.message);
        if (key === "users") next.users = String(issue.message);
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      if (isEdit && groupId != null) {
        const saved = await updateUserGroup(groupId, parsed.data);
        toastSuccess(t("updatedToast"));
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.settingsUserGroups, saved.id, safeBack));
      } else {
        const saved = await createUserGroup(parsed.data);
        toastSuccess(t("createdToast"));
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.settingsUserGroups, saved.id, safeBack));
      }
    } catch (error) {
      reportLocalFormSubmitApiError(error, (fieldErrors) => setErrors((prev) => ({ ...prev, ...fieldErrors })));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-0 w-full pb-8 sm:pb-10">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        actions={
          <div className="flex flex-wrap gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(safeBack)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="button" variant="primary" size="sm" loading={saving} disabled={loadingExisting} onClick={() => void handleSave()}>
              {t("modal.save")}
            </AppButton>
          </div>
        }
      />

      <SurfaceShell className="mt-3">
        {screenError ? (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">{screenError}</p>
        ) : loadingExisting ? (
          <div className="space-y-3 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <div className="space-y-5 p-4 sm:p-6">
            <FieldGroup
              label={
                <span>
                  {t("fields.name")} <span className="text-red-500">*</span>
                </span>
              }
              htmlFor="user-group-name"
            >
              <input
                id="user-group-name"
                value={name}
                disabled={saving}
                placeholder={t("placeholders.name")}
                autoComplete="off"
                className={cn(surfaceInputClassName, errors.name && "border-red-500 focus:border-red-500")}
                onChange={(e) => {
                  setName(sanitizeTitleInput(e.target.value));
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
              />
              <FieldErrorText>{errors.name}</FieldErrorText>
            </FieldGroup>

            <FieldGroup
              label={
                <span>
                  {t("fields.users")} <span className="text-red-500">*</span>
                </span>
              }
            >
              {usersLoadError ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">{usersLoadError}</p>
              ) : (
                <UserGroupMemberPicker
                  options={userOptions}
                  selectedIds={selectedIds}
                  disabled={saving}
                  invalid={Boolean(errors.users)}
                  availableTitle={t("picker.available")}
                  selectedTitle={t("picker.selected")}
                  emptyAvailable={t("picker.emptyAvailable")}
                  emptySelected={t("picker.emptySelected")}
                  onChange={(next) => {
                    setSelectedIds(next);
                    if (errors.users) setErrors((prev) => ({ ...prev, users: undefined }));
                  }}
                />
              )}
              <FieldErrorText>{errors.users}</FieldErrorText>
            </FieldGroup>
          </div>
        )}
      </SurfaceShell>
    </div>
  );
}
