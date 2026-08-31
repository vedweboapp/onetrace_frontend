"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { formatContactOptionLabel } from "@/features/contacts/utils/contact-name.util";
import { createQuotation, fetchProjectLevelRowsForQuotation } from "@/features/quotations/api/quotation.api";
import { QuotationAdditionalContactsFields } from "@/features/quotations/components/quotation-additional-contacts-fields";
import { QuotationDraftComposer } from "@/features/quotations/components/quotation-draft-composer";
import { QUOTE_CATEGORY } from "@/features/quotations/constants/quotation-category";
import { useQuotationDraftState } from "@/features/quotations/hooks/use-quotation-draft-state";
import type { ProjectLevelForQuotation } from "@/features/quotations/types/quotation.types";
import { mergeQuotationDraftIntoPayload } from "@/features/quotations/utils/quotation-draft-payload.util";
import {
  createQuotationFormSchema,
  type QuotationFormValues,
} from "@/features/quotations/schemas/quotation-form-schema";
import {
  emptyQuotationFormDefaults,
  mapQuotationFormToPayload,
  parseOptionalId,
} from "@/features/quotations/utils/quotation-form-map";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import {
  fetchUsersForAppRoles,
  userProfilesToSelectOptions,
} from "@/features/users/utils/load-users-by-role.util";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { FIELD_MAX_LENGTH, rhfRegisterOptions } from "@/shared/form";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { DetailTabStepNav } from "@/shared/components/layout/detail-tab-step-nav";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import {
  AppButton,
  AppModal,
  AppTabs,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  MultiCheckSelect,
  SurfaceDateInput,
  surfaceInputClassName,
  surfaceTextareaClassName,
} from "@/shared/ui";

const FORM_DOM_ID = "quotation-create-form";

type Option = { value: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function QuotationFormModal({ open, onClose, onSaved }: Props) {
  const t = useTranslations("Dashboard.quotations");
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [formTab, setFormTab] = React.useState<"project" | "pricing">("project");

  React.useEffect(() => {
    if (open) setFormTab("project");
  }, [open]);
  const [clientOptions, setClientOptions] = React.useState<Option[]>([]);
  const [siteRows, setSiteRows] = React.useState<Site[]>([]);
  const [projectRows, setProjectRows] = React.useState<Project[]>([]);
  const [contactOptions, setContactOptions] = React.useState<Option[]>([]);
  const [salesOptions, setSalesOptions] = React.useState<Option[]>([]);
  const [managerOptions, setManagerOptions] = React.useState<Option[]>([]);
  const [technicianOptions, setTechnicianOptions] = React.useState<Option[]>([]);
  const [levelRows, setLevelRows] = React.useState<ProjectLevelForQuotation[]>([]);

  const schema = React.useMemo(
    () =>
      createQuotationFormSchema({
        quoteName: t("validation.quoteName"),
        customer: t("validation.customer"),
        sites: t("validation.sites"),
        project: t("validation.project"),
      }),
    [t],
  );

  const { control, register, reset, setValue, getValues, setError, handleSubmit, formState: { errors } } =
    useForm<QuotationFormValues>({
      resolver: zodResolver(schema),
      defaultValues: emptyQuotationFormDefaults(),
      shouldUnregister: false,
    });

  const quoteNameRegister = register("quote_name");

  const customerIdStr = useWatch({ control, name: "customer" });
  const projectIdStr = useWatch({ control, name: "project" });
  const sitesStr = useWatch({ control, name: "sites" });
  React.useEffect(() => {
    if (!open) return;
    reset(emptyQuotationFormDefaults());
  }, [open, reset]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open) return;
    (async () => {
      try {
        const { items: clients } = await fetchClientsPage(1, 500, { is_active: true });
        if (!cancelled) setClientOptions(clients.map((c) => ({ value: String(c.id), label: c.name })));
      } catch {
        if (!cancelled) setClientOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const customerId =
    customerIdStr && /^\d+$/.test(customerIdStr.trim())
      ? Number.parseInt(customerIdStr.trim(), 10)
      : undefined;
  const projectId =
    projectIdStr && /^\d+$/.test(projectIdStr.trim())
      ? Number.parseInt(projectIdStr.trim(), 10)
      : undefined;

  React.useEffect(() => {
    let cancelled = false;
    if (!open) return;
    (async () => {
      try {
        const filters: { is_active?: boolean; client?: number } = { is_active: true };
        if (customerId && customerId > 0) filters.client = customerId;
        const { items: projects } = await fetchProjectsPage(1, 500, filters);
        if (!cancelled) setProjectRows(projects);
      } catch {
        if (!cancelled) setProjectRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open) return;
    (async () => {
      try {
        const byRole = await fetchUsersForAppRoles(["technician", "sales", "manager"]);
        if (!cancelled) {
          setTechnicianOptions(userProfilesToSelectOptions(byRole.technician ?? []));
          setSalesOptions(userProfilesToSelectOptions(byRole.sales ?? []));
          setManagerOptions(userProfilesToSelectOptions(byRole.manager ?? []));
        }
      } catch {
        if (!cancelled) {
          setTechnicianOptions([]);
          setSalesOptions([]);
          setManagerOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open || !projectId || projectId <= 0) {
      setSiteRows([]);
      return;
    }
    (async () => {
      try {
        const { items } = await fetchSitesPage(1, 500, { project: projectId });
        if (!cancelled) setSiteRows(items);
      } catch {
        if (!cancelled) setSiteRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open || !customerId || customerId <= 0) {
      setContactOptions([]);
      return;
    }
    (async () => {
      try {
        const { items } = await fetchContactsPage(1, 500, { client: customerId });
        if (!cancelled) {
          setContactOptions(items.map((c) => ({ value: String(c.id), label: formatContactOptionLabel(c) })));
        }
      } catch {
        if (!cancelled) setContactOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open || !projectId || projectId <= 0) {
      setLevelRows([]);
      return;
    }
    (async () => {
      const levels = await fetchProjectLevelRowsForQuotation(projectId);
      if (!cancelled) {
        setLevelRows(levels);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const siteOptions = React.useMemo<Option[]>(
    () => siteRows.map((s) => ({ value: String(s.id), label: s.site_name })),
    [siteRows],
  );

  const projectOptions = React.useMemo<Option[]>(
    () => projectRows.map((p) => ({ value: String(p.id), label: p.name })),
    [projectRows],
  );

  const clientQuickCreate = useQuickCreate({ kind: "client" });

  const projectQuickCreate = useQuickCreate({
    kind: "project",
    clientId: customerId,
    addDisabled: saving || !customerId,
  });

  const siteQuickCreate = useQuickCreate({
    kind: "site",
    clientId: customerId,
    addDisabled: saving || !customerId,
  });

  const contactQuickCreate = useQuickCreate({
    kind: "contact",
    clientId: customerId,
    addDisabled: saving || !customerId,
  });
  const pendingAdditionalContactRowRef = React.useRef<number | null>(null);
  const openUsersSettings = React.useCallback(() => {
    const current = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : routes.dashboard.quotations;
    router.push(buildPathWithStoredBack(`${routes.dashboard.settingsUsers}/new`, current));
  }, [router]);

  React.useEffect(() => {
    if (!open) return;
    const selectedProject = getValues("project")?.trim();
    if (!selectedProject || !customerId) return;
    const stillExists = projectRows.some((p) => String(p.id) === selectedProject);
    if (!stillExists) {
      setValue("project", "", { shouldDirty: true, shouldValidate: true });
      setValue("sites", [], { shouldDirty: true, shouldValidate: true });
    }
  }, [open, projectRows, customerId, getValues, setValue]);

  React.useEffect(() => {
    if (!open || !projectId || projectId <= 0) return;
    const selectedSites = getValues("sites") ?? [];
    if (selectedSites.length > 0) return;
    if (siteOptions.length !== 1) return;
    setValue("sites", [siteOptions[0].value], { shouldValidate: true, shouldDirty: true });
  }, [open, projectId, siteOptions, getValues, setValue]);

  React.useEffect(() => {
    if (!open) return;
    const selectedSites = getValues("sites") ?? [];
    if (selectedSites.length === 0) return;
    const valid = new Set(siteOptions.map((s) => s.value));
    const next = selectedSites.filter((id) => valid.has(id));
    if (next.length !== selectedSites.length) {
      setValue("sites", next, { shouldDirty: true, shouldValidate: true });
    }
  }, [open, siteOptions, getValues, setValue]);

  async function submit(values: QuotationFormValues) {
    setSaving(true);
    try {
      const base = mapQuotationFormToPayload(values, { quote_category: QUOTE_CATEGORY.project });
      const withDraft = quoteDraft ? mergeQuotationDraftIntoPayload(base, quoteDraft) : base;
      const payload = withDraft;
      const saved = await createQuotation(payload);
      toastSuccess(t("createdToast"));
      onSaved();
      onClose();
      router.push(buildEntityDetailHrefAfterSave(routes.dashboard.quotations, saved.id, routes.dashboard.quotations));
    } catch (error) {
      reportFormSubmitApiError(error, setError, t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  const noClients = clientOptions.length === 0;
  const canShowLevels = !!projectId && projectId > 0;

  const sortedLevelRows = React.useMemo(() => {
    const rows = Array.isArray(levelRows) ? levelRows : [];
    return [...rows].sort((a, b) => {
      const ao = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
      const bo = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [levelRows]);

  const [quoteDraft, setQuoteDraft] = useQuotationDraftState(open, projectId, sortedLevelRows);

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={t("modal.createTitle")}
      titleId="quotation-modal-title"
      closeOnBackdrop={!saving}
      isBusy={saving}
      size="5xl"
      footer={
        <>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => (!saving ? onClose() : undefined)}
          >
            {t("modal.cancel")}
          </AppButton>
          <AppButton type="submit" form={FORM_DOM_ID} variant="primary" size="sm" loading={saving} disabled={noClients}>
            {t("modal.save")}
          </AppButton>
        </>
      }
    >
      <>
      <form id={FORM_DOM_ID} className="max-h-[min(70vh,680px)] space-y-6 overflow-y-auto pr-1" noValidate onSubmit={handleSubmit(submit)}>
        {/* {noClients ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {t("noClientsHint")}
          </p>
        ) : null} */}

        <AppTabs
          tabs={[
            { id: "project", label: t("formTabs.project") },
            { id: "pricing", label: t("formTabs.pricing") },
          ]}
          value={formTab}
          onValueChange={(id) => setFormTab(id === "pricing" ? "pricing" : "project")}
          ariaLabel={t("formTabs.aria")}
          panelIdPrefix="quotation-form-modal"
        />
        <div
          role="tabpanel"
          id="quotation-form-modal-project"
          aria-labelledby="quotation-form-modal-trigger-project"
          className={cn("space-y-6", formTab !== "project" && "hidden")}
        >
        <FormFieldRow cols="2">
          <FieldGroup label={t("fields.quoteName")} htmlFor="quotation-name" required>
            <input
              id="quotation-name"
              aria-invalid={errors.quote_name ? true : undefined}
              className={cn(surfaceInputClassName, errors.quote_name && "border-red-500 dark:border-red-500")}
              {...quoteNameRegister}
              onBlur={(e) => {
                quoteNameRegister.onBlur(e);
                const next = sanitizeTitleInput(e.target.value);
                if (next !== e.target.value) setValue("quote_name", next, { shouldValidate: true });
              }}
            />
            <FieldErrorText>{errors.quote_name?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.customer")} htmlFor="quotation-customer" required>
            <Controller
              control={control}
              name="customer"
              render={({ field }) => (
                <CheckmarkSelect
                  id="quotation-customer"
                  portaled
                  listLabel={t("fields.customer")}
                  options={clientOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.customer")}
                  disabled={saving}
                  invalid={!!errors.customer}
                  onBlur={field.onBlur}
                  onAdd={clientQuickCreate.onAdd}
                  addAriaLabel={clientQuickCreate.addAriaLabel}
                  addLabel={clientQuickCreate.addLabel}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue("sites", []);
                    setValue("project", "");
                    setValue("primary_customer_contact", "");
                    setValue("additional_customer_contacts", []);
                    setValue("site_contact", "");
                  }}
                />
              )}
            />
            <FieldErrorText>{errors.customer?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.project")} htmlFor="quotation-project" required>
            <Controller
              control={control}
              name="project"
              render={({ field }) => (
                <CheckmarkSelect
                  id="quotation-project"
                  portaled
                  searchable
                  listLabel={t("fields.project")}
                  options={projectOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.project")}
                  disabled={saving || !customerId}
                  invalid={!!errors.project}
                  onBlur={field.onBlur}
                  onAdd={projectQuickCreate.onAdd}
                  addAriaLabel={projectQuickCreate.addAriaLabel}
                  addLabel={projectQuickCreate.addLabel}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue("sites", []);
                    setValue("site_contact", "");
                  }}
                />
              )}
            />
            <FieldErrorText>{errors.project?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.sites")} htmlFor="quotation-sites" required>
            <Controller
              control={control}
              name="sites"
              render={({ field }) => (
                <MultiCheckSelect
                  id="quotation-sites"
                  options={siteOptions}
                  values={field.value ?? []}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={saving || !projectId}
                  placeholder={t("placeholders.site")}
                  listLabel={t("fields.sites")}
                  onAdd={siteQuickCreate.onAdd}
                  addAriaLabel={siteQuickCreate.addAriaLabel}
                  addLabel={siteQuickCreate.addLabel}
                />
              )}
            />
            <FieldErrorText>{errors.sites?.message}</FieldErrorText>
          </FieldGroup>
        </FormFieldRow>

        <FormFieldRow cols="2">
          <FieldGroup label={t("fields.primaryContact")} htmlFor="quotation-primary-contact">
            <Controller
              control={control}
              name="primary_customer_contact"
              render={({ field }) => (
                <CheckmarkSelect
                  id="quotation-primary-contact"
                  portaled
                  listLabel={t("fields.primaryContact")}
                  options={contactOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.contactOptional")}
                  disabled={saving || !customerId}
                  onBlur={field.onBlur}
                  onAdd={contactQuickCreate.onAdd}
                  addAriaLabel={contactQuickCreate.addAriaLabel}
                  addLabel={contactQuickCreate.addLabel}
                  onChange={field.onChange}
                />
              )}
            />
          </FieldGroup>
          <FieldGroup label={t("fields.dueDate")} htmlFor="quotation-due">
            <SurfaceDateInput id="quotation-due" type="date" {...register("due_date")} />
          </FieldGroup>
        </FormFieldRow>

        <QuotationAdditionalContactsFields
          control={control}
          contactOptions={contactOptions}
          customerId={customerId}
          disabled={saving}
          onAddContact={contactQuickCreate.onAdd}
          addAriaLabel={contactQuickCreate.addAriaLabel}
          addLabel={contactQuickCreate.addLabel}
          onRequestAddContact={(rowIndex) => {
            pendingAdditionalContactRowRef.current = rowIndex;
          }}
        />

        <FormFieldRow cols="2">
          <FieldGroup label={t("fields.siteContact")} htmlFor="quotation-site-contact">
            <Controller
              control={control}
              name="site_contact"
              render={({ field }) => (
                <CheckmarkSelect
                  id="quotation-site-contact"
                  portaled
                  listLabel={t("fields.siteContact")}
                  options={contactOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.contactOptional")}
                  disabled={saving || !customerId}
                  onBlur={field.onBlur}
                  onAdd={contactQuickCreate.onAdd}
                  addAriaLabel={contactQuickCreate.addAriaLabel}
                  addLabel={contactQuickCreate.addLabel}
                  onChange={field.onChange}
                />
              )}
            />
          </FieldGroup>
        </FormFieldRow>

        <FormFieldRow cols="2">
          <FieldGroup label={t("fields.salesperson")} htmlFor="quotation-sales">
            <Controller
              control={control}
              name="salesperson"
              render={({ field }) => (
                <CheckmarkSelect
                  id="quotation-sales"
                  portaled
                  listLabel={t("fields.salesperson")}
                  options={salesOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.userOptional")}
                  disabled={saving}
                  onBlur={field.onBlur}
                  onAdd={openUsersSettings}
                  addAriaLabel="Add user"
                  addLabel="Add new"
                  onChange={field.onChange}
                />
              )}
            />
          </FieldGroup>
          <FieldGroup label={t("fields.projectManager")} htmlFor="quotation-pm">
            <Controller
              control={control}
              name="project_manager"
              render={({ field }) => (
                <CheckmarkSelect
                  id="quotation-pm"
                  portaled
                  listLabel={t("fields.projectManager")}
                  options={managerOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.userOptional")}
                  disabled={saving}
                  onBlur={field.onBlur}
                  onAdd={openUsersSettings}
                  addAriaLabel="Add user"
                  addLabel="Add new"
                  onChange={field.onChange}
                />
              )}
            />
          </FieldGroup>
        </FormFieldRow>

        <FormFieldRow cols="2">
          <FieldGroup label={t("fields.tags")} htmlFor="quotation-tags">
            <input
              id="quotation-tags"
              placeholder={t("placeholders.tags")}
              className={surfaceInputClassName}
              {...register("tags_raw")}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("hints.tags")}</p>
          </FieldGroup>
          <FieldGroup label={t("fields.technicians")} htmlFor="quotation-modal-technicians">
            {technicianOptions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("hints.noUsers")}</p>
            ) : (
              <Controller
                control={control}
                name="technician_ids"
                render={({ field }) => (
                  <MultiCheckSelect
                    id="quotation-modal-technicians"
                    options={technicianOptions}
                    values={(field.value ?? []).map(String)}
                    onChange={(next) =>
                      field.onChange(
                        next.map((v) => Number.parseInt(v, 10)).filter((n) => Number.isFinite(n) && n > 0),
                      )
                    }
                    onBlur={field.onBlur}
                    disabled={saving}
                    listLabel={t("fields.technicians")}
                    placeholder={t("placeholders.userOptional")}
                    onAdd={openUsersSettings}
                    addAriaLabel="Add user"
                    addLabel="Add new"
                  />
                )}
              />
            )}
          </FieldGroup>
        </FormFieldRow>

        <FieldGroup label={t("fields.description")} htmlFor="quotation-desc">
          <textarea
            id="quotation-desc"
            rows={4}
            className={surfaceTextareaClassName}
            maxLength={FIELD_MAX_LENGTH.DESCRIPTION}
            {...register("description", rhfRegisterOptions("description"))}
          />
        </FieldGroup>
        <DetailTabStepNav onNext={() => setFormTab("pricing")} nextLabel={t("formTabs.nextToPricing")} />
        </div>
        <div
          role="tabpanel"
          id="quotation-form-modal-pricing"
          aria-labelledby="quotation-form-modal-trigger-pricing"
          className={cn(formTab !== "pricing" && "hidden")}
        >
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-100">{t("levels.sectionsTitle")}</p>
            <QuotationDraftComposer
              draft={quoteDraft}
              onDraftChange={setQuoteDraft}
              saving={saving}
              canShow={canShowLevels}
              allowManualLines={false}
            />
          </div>
          <DetailTabStepNav onPrev={() => setFormTab("project")} prevLabel={t("formTabs.prevToProject")} />
        </div>
      </form>
      </>
    </AppModal>
  );
}
