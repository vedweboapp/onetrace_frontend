"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import {
  createQuotation,
  fetchProjectLevelsForQuotation,
  fetchWorkspaceUsers,
} from "@/features/quotations/api/quotation.api";
import type { QuotationLevelRef } from "@/features/quotations/types/quotation.types";
import {
  createQuotationFormSchema,
  type QuotationFormValues,
} from "@/features/quotations/schemas/quotation-form-schema";
import {
  emptyQuotationFormDefaults,
  mapQuotationFormToPayload,
} from "@/features/quotations/utils/quotation-form-map";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  surfaceInputClassName,
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
  const [saving, setSaving] = React.useState(false);
  const [clientOptions, setClientOptions] = React.useState<Option[]>([]);
  const [siteRows, setSiteRows] = React.useState<Site[]>([]);
  const [projectRows, setProjectRows] = React.useState<Project[]>([]);
  const [contactOptions, setContactOptions] = React.useState<Option[]>([]);
  const [userOptions, setUserOptions] = React.useState<Option[]>([]);
  const [levelRows, setLevelRows] = React.useState<QuotationLevelRef[]>([]);

  const schema = React.useMemo(
    () =>
      createQuotationFormSchema({
        quoteName: t("validation.quoteName"),
        customer: t("validation.customer"),
        site: t("validation.site"),
        project: t("validation.project"),
      }),
    [t],
  );

  const { control, register, reset, setValue, getValues, handleSubmit, formState: { errors } } =
    useForm<QuotationFormValues>({
      resolver: zodResolver(schema),
      defaultValues: emptyQuotationFormDefaults(),
    });

  const customerIdStr = useWatch({ control, name: "customer" });
  const projectIdStr = useWatch({ control, name: "project" });
  const selectAllLevels = useWatch({ control, name: "select_all_levels" });
  const technicianIds = useWatch({ control, name: "technician_ids" }) ?? [];
  const levelIds = useWatch({ control, name: "level_ids" }) ?? [];

  React.useEffect(() => {
    if (!open) return;
    reset(emptyQuotationFormDefaults());
  }, [open, reset]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open) return;
    (async () => {
      try {
        const { items: clients } = await fetchClientsPage(1, 500);
        if (!cancelled) setClientOptions(clients.map((c) => ({ value: String(c.id), label: c.name })));
      } catch {
        if (!cancelled) setClientOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open) return;
    (async () => {
      try {
        const { items: projects } = await fetchProjectsPage(1, 500);
        if (!cancelled) setProjectRows(projects);
      } catch {
        if (!cancelled) setProjectRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open) return;
    (async () => {
      try {
        const users = await fetchWorkspaceUsers();
        if (!cancelled) {
          setUserOptions(
            users.map((u) => ({
              value: String(u.id),
              label: `${u.username} (${u.email})`,
            })),
          );
        }
      } catch {
        if (!cancelled) setUserOptions([]);
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

  React.useEffect(() => {
    let cancelled = false;
    if (!open || !customerId || customerId <= 0) {
      setSiteRows([]);
      return;
    }
    (async () => {
      try {
        const { items } = await fetchSitesPage(1, 500, { client: customerId });
        if (!cancelled) setSiteRows(items);
      } catch {
        if (!cancelled) setSiteRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

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
          setContactOptions(items.map((c) => ({ value: String(c.id), label: c.name })));
        }
      } catch {
        if (!cancelled) setContactOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  const projectId =
    projectIdStr && /^\d+$/.test(projectIdStr.trim())
      ? Number.parseInt(projectIdStr.trim(), 10)
      : undefined;

  React.useEffect(() => {
    let cancelled = false;
    if (!open || !projectId || projectId <= 0) {
      setLevelRows([]);
      return;
    }
    (async () => {
      const levels = await fetchProjectLevelsForQuotation(projectId);
      if (!cancelled) {
        setLevelRows(levels);
        setValue("level_ids", []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, setValue]);

  const siteOptions = React.useMemo<Option[]>(
    () => siteRows.map((s) => ({ value: String(s.id), label: s.site_name })),
    [siteRows],
  );

  const projectOptions = React.useMemo<Option[]>(() => {
    if (!customerId || customerId <= 0) return [];
    return projectRows
      .filter((p) => p.client === customerId)
      .map((p) => ({ value: String(p.id), label: p.name }));
  }, [projectRows, customerId]);

  function toggleInNumberList(field: "technician_ids" | "level_ids", id: number) {
    const key = field;
    const current = getValues(key) ?? [];
    if (current.includes(id)) {
      setValue(
        key,
        current.filter((x) => x !== id),
        { shouldValidate: true, shouldDirty: true },
      );
    } else {
      setValue(key, [...current, id], { shouldValidate: true, shouldDirty: true });
    }
  }

  async function submit(values: QuotationFormValues) {
    setSaving(true);
    try {
      const payload = mapQuotationFormToPayload(values);
      await createQuotation(payload);
      toastSuccess(t("createdToast"));
      onSaved();
      onClose();
    } catch {
      toastError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  const noClients = clientOptions.length === 0;

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={t("modal.createTitle")}
      titleId="quotation-modal-title"
      closeOnBackdrop={!saving}
      isBusy={saving}
      size="3xl"
      footer={
        <>
          <AppButton
            type="button"
            variant="secondary"
            size="md"
            disabled={saving}
            onClick={() => (!saving ? onClose() : undefined)}
          >
            {t("modal.cancel")}
          </AppButton>
          <AppButton type="submit" form={FORM_DOM_ID} variant="primary" size="md" loading={saving} disabled={noClients}>
            {t("modal.save")}
          </AppButton>
        </>
      }
    >
      <form id={FORM_DOM_ID} className="max-h-[min(70vh,680px)] space-y-6 overflow-y-auto pr-1" noValidate onSubmit={handleSubmit(submit)}>
        {noClients ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {t("noClientsHint")}
          </p>
        ) : null}

        <FormFieldRow cols="2">
          <FieldGroup label={t("fields.quoteName")} htmlFor="quotation-name" required>
            <input
              id="quotation-name"
              aria-invalid={errors.quote_name ? true : undefined}
              className={cn(surfaceInputClassName, errors.quote_name && "border-red-500 dark:border-red-500")}
              {...register("quote_name")}
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
                  disabled={saving || noClients}
                  invalid={!!errors.customer}
                  onBlur={field.onBlur}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue("site", "");
                    setValue("project", "");
                    setValue("primary_customer_contact", "");
                    setValue("additional_customer_contact", "");
                    setValue("site_contact", "");
                  }}
                />
              )}
            />
            <FieldErrorText>{errors.customer?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.site")} htmlFor="quotation-site" required>
            <Controller
              control={control}
              name="site"
              render={({ field }) => (
                <CheckmarkSelect
                  id="quotation-site"
                  portaled
                  listLabel={t("fields.site")}
                  options={siteOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.site")}
                  disabled={saving || !customerId || siteOptions.length === 0}
                  invalid={!!errors.site}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldErrorText>{errors.site?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.project")} htmlFor="quotation-project" required>
            <Controller
              control={control}
              name="project"
              render={({ field }) => (
                <CheckmarkSelect
                  id="quotation-project"
                  portaled
                  listLabel={t("fields.project")}
                  options={projectOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.project")}
                  disabled={saving || !customerId || projectOptions.length === 0}
                  invalid={!!errors.project}
                  onBlur={field.onBlur}
                  onChange={(v) => {
                    field.onChange(v);
                  }}
                />
              )}
            />
            <FieldErrorText>{errors.project?.message}</FieldErrorText>
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
                  onChange={field.onChange}
                />
              )}
            />
          </FieldGroup>
          <FieldGroup label={t("fields.additionalContact")} htmlFor="quotation-additional-contact">
            <Controller
              control={control}
              name="additional_customer_contact"
              render={({ field }) => (
                <CheckmarkSelect
                  id="quotation-additional-contact"
                  portaled
                  listLabel={t("fields.additionalContact")}
                  options={contactOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.contactOptional")}
                  disabled={saving || !customerId}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
          </FieldGroup>
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
                  onChange={field.onChange}
                />
              )}
            />
          </FieldGroup>
          <FieldGroup label={t("fields.orderNumber")} htmlFor="quotation-order">
            <input id="quotation-order" className={surfaceInputClassName} {...register("order_number")} />
          </FieldGroup>
          <FieldGroup label={t("fields.dueDate")} htmlFor="quotation-due">
            <input id="quotation-due" type="date" className={surfaceInputClassName} {...register("due_date")} />
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
                  options={userOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.userOptional")}
                  disabled={saving}
                  onBlur={field.onBlur}
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
                  options={userOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.userOptional")}
                  disabled={saving}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
          </FieldGroup>
          <FieldGroup label={t("fields.tags")} htmlFor="quotation-tags">
            <input
              id="quotation-tags"
              placeholder={t("placeholders.tags")}
              className={surfaceInputClassName}
              {...register("tags_raw")}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("hints.tags")}</p>
          </FieldGroup>
        </FormFieldRow>

        <FieldGroup label={t("fields.description")} htmlFor="quotation-desc">
          <textarea id="quotation-desc" rows={3} className={cn(surfaceInputClassName, "min-h-[5rem]")} {...register("description")} />
        </FieldGroup>

        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-800 dark:text-slate-100">
            <input type="checkbox" className="mt-1" {...register("select_all_levels")} disabled={saving} />
            <span>{t("fields.selectAllLevels")}</span>
          </label>
          {!selectAllLevels ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("fields.levels")}</p>
              {levelRows.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("hints.noLevels")}</p>
              ) : (
                <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                  {levelRows.map((lv) => (
                    <li key={lv.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={levelIds.includes(lv.id)}
                          onChange={() => toggleInNumberList("level_ids", lv.id)}
                          disabled={saving}
                        />
                        <span>{lv.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-100">{t("fields.technicians")}</p>
          {userOptions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("hints.noUsers")}</p>
          ) : (
            <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {userOptions.map((o) => {
                const uid = Number.parseInt(o.value, 10);
                return (
                  <li key={o.value}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={technicianIds.includes(uid)}
                        onChange={() => toggleInNumberList("technician_ids", uid)}
                        disabled={saving}
                      />
                      <span>{o.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </form>
    </AppModal>
  );
}
