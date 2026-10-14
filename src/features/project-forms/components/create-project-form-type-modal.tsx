"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchInstallationTypesPage } from "@/features/installation-types/api/installation-type.api";
import type { InstallationType } from "@/features/installation-types/types/installation-type.types";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { AppButton, AppModal, CheckmarkSelect, type CheckmarkSelectOption } from "@/shared/ui";

export type CreateProjectFormTypeContinue = {
  projectTypeId: number;
  installationTypeId: number;
};

export type CreateProjectFormTypeModalProps = {
  open: boolean;
  onClose: () => void;
  onContinue: (args: CreateProjectFormTypeContinue) => void;
  /** Prefill project type (e.g. from Create Project). */
  defaultProjectTypeId?: number | null;
  /** Label for locked/default project type while options load. */
  defaultProjectTypeLabel?: string | null;
  /** When true, project type cannot be changed. */
  lockProjectType?: boolean;
};

export function CreateProjectFormTypeModal({
  open,
  onClose,
  onContinue,
  defaultProjectTypeId = null,
  defaultProjectTypeLabel = null,
  lockProjectType = false,
}: CreateProjectFormTypeModalProps) {
  const t = useTranslations("Dashboard.settingsProjectForms");

  const [projectTypes, setProjectTypes] = React.useState<ProjectType[]>([]);
  const [projectTypesLoading, setProjectTypesLoading] = React.useState(false);
  const [projectTypesError, setProjectTypesError] = React.useState<string | null>(null);
  const [installationTypes, setInstallationTypes] = React.useState<InstallationType[]>([]);
  const [installationTypesLoading, setInstallationTypesLoading] = React.useState(false);
  const [installationTypesError, setInstallationTypesError] = React.useState<string | null>(null);
  const [selectedProjectTypeId, setSelectedProjectTypeId] = React.useState<number | null>(null);
  const [selectedInstallationTypeId, setSelectedInstallationTypeId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSelectedProjectTypeId(
      defaultProjectTypeId != null && defaultProjectTypeId > 0 ? defaultProjectTypeId : null,
    );
    setSelectedInstallationTypeId(null);
  }, [open, defaultProjectTypeId]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setProjectTypesLoading(true);
      setProjectTypesError(null);
      try {
        const response = await fetchProjectTypesPage(1, 50, {
          is_active: true,
          dropdown: true,
        });
        if (!cancelled) {
          setProjectTypes(Array.isArray(response.items) ? response.items : []);
        }
      } catch {
        if (!cancelled) {
          setProjectTypes([]);
          setProjectTypesError(t("projectTypesLoadError"));
        }
      } finally {
        if (!cancelled) setProjectTypesLoading(false);
      }

      setInstallationTypesLoading(true);
      setInstallationTypesError(null);
      try {
        const response = await fetchInstallationTypesPage(1, 50, {
          is_active: true,
          dropdown: true,
        });
        if (!cancelled) {
          setInstallationTypes(Array.isArray(response.items) ? response.items : []);
        }
      } catch {
        if (!cancelled) {
          setInstallationTypes([]);
          setInstallationTypesError(t("installationTypesLoadError"));
        }
      } finally {
        if (!cancelled) setInstallationTypesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  const projectTypeOptions = React.useMemo<CheckmarkSelectOption[]>(
    () =>
      Array.isArray(projectTypes)
        ? projectTypes.map((projectType) => ({
            value: String(projectType.id),
            label: projectType.project_type || `#${projectType.id}`,
          }))
        : [],
    [projectTypes],
  );

  const installationTypeOptions = React.useMemo<CheckmarkSelectOption[]>(
    () =>
      Array.isArray(installationTypes)
        ? installationTypes.map((inst) => ({
            value: String(inst.id),
            label: inst.installation_type || `#${inst.id}`,
          }))
        : [],
    [installationTypes],
  );

  const handleContinue = React.useCallback(() => {
    if (!selectedProjectTypeId || !selectedInstallationTypeId) return;
    onContinue({
      projectTypeId: selectedProjectTypeId,
      installationTypeId: selectedInstallationTypeId,
    });
  }, [onContinue, selectedProjectTypeId, selectedInstallationTypeId]);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("modal.selectProjectTypeTitle")}
      description={t("modal.selectProjectTypeDescription")}
      size="lg"
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onClose}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton
            type="button"
            onClick={handleContinue}
            disabled={!selectedProjectTypeId || !selectedInstallationTypeId}
          >
            {t("modal.next")}
          </AppButton>
        </>
      }
    >
      <div className="space-y-4">
        {projectTypesError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{projectTypesError}</p>
        ) : null}
        <CheckmarkSelect
          label={t("table.projectType")}
          required
          listLabel={t("modal.projectTypesList")}
          buttonAriaLabel={t("modal.selectProjectTypeAria")}
          value={selectedProjectTypeId ? String(selectedProjectTypeId) : ""}
          onChange={(value) => setSelectedProjectTypeId(value ? Number(value) : null)}
          options={projectTypeOptions}
          emptyLabel={
            projectTypesLoading ? t("modal.loadingProjectTypes") : t("modal.selectProjectType")
          }
          disabled={
            lockProjectType || projectTypesLoading || projectTypesError != null
          }
          locked={lockProjectType && selectedProjectTypeId != null}
          searchable={!lockProjectType}
          searchPlaceholder={t("modal.searchProjectTypes")}
          fallbackLabel={defaultProjectTypeLabel?.trim() || undefined}
          className="w-full"
        />
        <CheckmarkSelect
          label={t("table.installationType")}
          required
          listLabel={t("modal.installationTypesList")}
          buttonAriaLabel={t("modal.selectInstallationTypeAria")}
          value={selectedInstallationTypeId ? String(selectedInstallationTypeId) : ""}
          onChange={(value) => setSelectedInstallationTypeId(value ? Number(value) : null)}
          options={installationTypeOptions}
          emptyLabel={
            installationTypesLoading
              ? t("modal.loadingInstallationTypes")
              : t("modal.selectInstallationType")
          }
          disabled={installationTypesLoading || installationTypesError != null}
          searchable
          searchPlaceholder={t("modal.searchInstallationTypes")}
          className="w-full"
        />
        {!projectTypesLoading && !projectTypesError && projectTypeOptions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("modal.noProjectTypes")}</p>
        ) : null}
        {!installationTypesLoading &&
        !installationTypesError &&
        installationTypeOptions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("modal.noInstallationTypes")}
          </p>
        ) : null}
      </div>
    </AppModal>
  );
}
