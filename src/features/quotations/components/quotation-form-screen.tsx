"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import {
  createQuotation,
  fetchProjectLevelRowsForQuotation,
  fetchQuotation,
  updateQuotation,
} from "@/features/quotations/api/quotation.api";
import { QuotationDraftComposer } from "@/features/quotations/components/quotation-draft-composer";
import { useQuotationDraftState } from "@/features/quotations/hooks/use-quotation-draft-state";
import type { ProjectLevelForQuotation, QuotationDetail } from "@/features/quotations/types/quotation.types";
import { applyQuotationSiteSnapshot, mergeQuotationDraftIntoPayload } from "@/features/quotations/utils/quotation-draft-payload.util";
import {
  createQuotationFormSchema,
  type QuotationFormValues,
} from "@/features/quotations/schemas/quotation-form-schema";
import {
  emptyQuotationFormDefaults,
  mapQuotationDetailToFormDefaults,
  mapQuotationFormToPayload,
  parseOptionalId,
} from "@/features/quotations/utils/quotation-form-map";
import {
  getQuotationCustomerId,
  getQuotationNestedSite,
  getQuotationSiteId,
  quotationNestedSiteToSite,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { DetailFormattedAddress, hasDetailAddress } from "@/shared/components/layout/detail-formatted-address";
import { fetchTagsPage } from "@/features/tags/api/tag.api";
import type { Tag } from "@/features/tags/types/tag.types";
import { fetchRoles, fetchUsersPage } from "@/features/users/api/user.api";
import type { UserProfile } from "@/features/users/types/user.types";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { mergeUrlQueryParam, sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import {
  AppButton,
  AppTabs,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  MultiCheckSelect,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

const AddressMiniMap = dynamic(
  () => import("@/shared/components/maps/address-mini-map").then((m) => m.AddressMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] flex-1 animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
    ),
  },
);

type Props = {
  mode: "create" | "edit";
  quotationId?: number;
};

type Option = { value: string; label: string };

export function QuotationFormScreen({ mode, quotationId }: Props) {
  const t = useTranslations("Dashboard.quotations");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = React.useMemo(() => {
    const raw = searchParams.get("back");
    return (
      sanitizeInternalListBack(raw, "quotations") ??
      sanitizeInternalListBack(raw, "projects") ??
      routes.dashboard.quotations
    );
  }, [searchParams]);
  const isEdit = mode === "edit";

  const createFromProjectId = React.useMemo(() => {
    if (isEdit) return null;
    const raw = searchParams.get("project")?.trim();
    if (!raw || !/^\d+$/.test(raw)) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [isEdit, searchParams]);

  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [existingDetail, setExistingDetail] = React.useState<QuotationDetail | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [clientOptions, setClientOptions] = React.useState<Option[]>([]);
  const [siteRows, setSiteRows] = React.useState<Site[]>([]);
  const [projectRows, setProjectRows] = React.useState<Project[]>([]);
  const [contactOptions, setContactOptions] = React.useState<Option[]>([]);
  const [tagOptions, setTagOptions] = React.useState<Option[]>([]);
  const [salesOptions, setSalesOptions] = React.useState<Option[]>([]);
  const [managerOptions, setManagerOptions] = React.useState<Option[]>([]);
  const [technicianOptions, setTechnicianOptions] = React.useState<Option[]>([]);
  const [levelRows, setLevelRows] = React.useState<ProjectLevelForQuotation[]>([]);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [formTab, setFormTab] = React.useState<"project" | "pricing">("project");

  React.useEffect(() => {
    setFormTab("project");
  }, [mode, quotationId]);

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

  const {
    control,
    register,
    reset,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyQuotationFormDefaults(),
  });

  React.useEffect(() => {
    if (!isEdit || !quotationId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchQuotation(quotationId);
        if (!cancelled) {
          setExistingDetail(row);
          reset(mapQuotationDetailToFormDefaults(row));
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
  }, [isEdit, quotationId, reset, t]);

  const customerIdStr = useWatch({ control, name: "customer" });
  const projectIdStr = useWatch({ control, name: "project" });
  const siteStr = useWatch({ control, name: "site" });
  const appliedFromProjectIdRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!createFromProjectId) {
      appliedFromProjectIdRef.current = null;
    }
  }, [createFromProjectId]);

  React.useEffect(() => {
    if (isEdit || !createFromProjectId) return;
    if (appliedFromProjectIdRef.current === createFromProjectId) return;
    if (projectRows.length === 0) return;
    const row = projectRows.find((p) => p.id === createFromProjectId);
    if (!row) {
      appliedFromProjectIdRef.current = createFromProjectId;
      return;
    }
    setValue("project", String(createFromProjectId), { shouldValidate: true, shouldDirty: true });
    setValue("select_all_levels", false, { shouldValidate: true, shouldDirty: true });
    setValue("level_ids", [], { shouldDirty: true, shouldValidate: true });
    appliedFromProjectIdRef.current = createFromProjectId;
  }, [isEdit, createFromProjectId, projectRows, setValue]);

  React.useEffect(() => {
    let cancelled = false;
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
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchTagsPage(1, 500, { is_active: true });
        if (!cancelled) {
          const toLabel = (row: Tag) => row.name ?? row.tag_name ?? `#${row.id}`;
          setTagOptions(items.map((row) => ({ value: String(row.id), label: toLabel(row) })));
        }
      } catch {
        if (!cancelled) setTagOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: projects } = await fetchProjectsPage(1, 500, { is_active: true });
        if (!cancelled) setProjectRows(projects);
      } catch {
        if (!cancelled) setProjectRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [roles, allUsers] = await Promise.all([fetchRoles(), fetchUsersPage(1, 500)]);
        const roleIdByKey = new Map<string, number>();
        for (const r of roles) {
          const roleName = (r.role_name ?? r.name ?? "").toLowerCase();
          if (!roleName) continue;
          if (roleName.includes("tech")) roleIdByKey.set("technician", r.id);
          if (roleName.includes("sale")) roleIdByKey.set("sales", r.id);
          if (roleName.includes("manager")) roleIdByKey.set("manager", r.id);
        }

        const toOpt = (u: UserProfile): Option => {
          const fullName = `${u.user_detail.first_name ?? ""} ${u.user_detail.last_name ?? ""}`.trim();
          const label = fullName || u.user_detail.email?.trim() || `#${u.user_detail.id}`;
          return { value: String(u.user_detail.id), label };
        };
        const asOpts = (rows: UserProfile[]) => rows.map(toOpt);

        const [techRes, salesRes, managerRes] = await Promise.all([
          roleIdByKey.get("technician")
            ? fetchUsersPage(1, 500, { role: roleIdByKey.get("technician")! })
            : Promise.resolve({ items: allUsers.items, pagination: allUsers.pagination }),
          roleIdByKey.get("sales")
            ? fetchUsersPage(1, 500, { role: roleIdByKey.get("sales")! })
            : Promise.resolve({ items: allUsers.items, pagination: allUsers.pagination }),
          roleIdByKey.get("manager")
            ? fetchUsersPage(1, 500, { role: roleIdByKey.get("manager")! })
            : Promise.resolve({ items: allUsers.items, pagination: allUsers.pagination }),
        ]);

        if (!cancelled) {
          setTechnicianOptions(asOpts(techRes.items));
          setSalesOptions(asOpts(salesRes.items));
          setManagerOptions(asOpts(managerRes.items));
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
  }, []);

  const customerId =
    customerIdStr && /^\d+$/.test(customerIdStr.trim())
      ? Number.parseInt(customerIdStr.trim(), 10)
      : undefined;
  const projectId =
    projectIdStr && /^\d+$/.test(projectIdStr.trim())
      ? Number.parseInt(projectIdStr.trim(), 10)
      : undefined;
  const selectedProject = React.useMemo(
    () => (projectId ? projectRows.find((p) => p.id === projectId) : undefined),
    [projectId, projectRows],
  );
  const selectedProjectClientId = selectedProject ? getProjectClientId(selectedProject) ?? undefined : undefined;
  const effectiveClientId = selectedProjectClientId ?? customerId;

  React.useEffect(() => {
    if (!selectedProjectClientId) return;
    const next = String(selectedProjectClientId);
    if (getValues("customer") !== next) {
      setValue("customer", next, { shouldDirty: true, shouldValidate: true });
      setValue("primary_customer_contact", "", { shouldDirty: true, shouldValidate: true });
      setValue("additional_customer_contact", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [selectedProjectClientId, getValues, setValue]);

  React.useEffect(() => {
    let cancelled = false;
    if (!effectiveClientId || effectiveClientId <= 0) {
      setSiteRows([]);
      return;
    }
    (async () => {
      try {
        const { items } = await fetchSitesPage(1, 500, { client: effectiveClientId, is_active: true });
        if (!cancelled) setSiteRows(items);
      } catch {
        if (!cancelled) setSiteRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveClientId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!effectiveClientId || effectiveClientId <= 0) {
      setContactOptions([]);
      return;
    }
    (async () => {
      try {
        const { items } = await fetchContactsPage(1, 500, { client: effectiveClientId, is_active: true });
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
  }, [effectiveClientId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!projectId || projectId <= 0) {
      setLevelRows([]);
      return;
    }
    (async () => {
      const levels = await fetchProjectLevelRowsForQuotation(projectId);
      if (!cancelled) {
        setLevelRows(levels);
        if (!isEdit) {
          const current = getValues("level_ids") ?? [];
          const allLevels = getValues("select_all_levels");
          if (current.length === 0 && !allLevels) {
            const orderedIds = [...levels]
              .sort((a, b) => {
                const ao = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
                const bo = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
                if (ao !== bo) return ao - bo;
                return (a.name ?? "").localeCompare(b.name ?? "");
              })
              .map((r) => r.id)
              .filter((id) => Number.isFinite(id) && id > 0);
            setValue("level_ids", orderedIds, { shouldDirty: false, shouldValidate: true });
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, projectId, setValue, getValues]);

  const siteOptions = React.useMemo<Option[]>(() => {
    let rows = siteRows;
    if (selectedProject && Array.isArray(selectedProject.sites) && selectedProject.sites.length > 0) {
      const allowed = new Set(
        selectedProject.sites
          .map((s) => (typeof s === "number" ? s : s?.id))
          .filter((id): id is number => Number.isFinite(id) && id > 0),
      );
      rows = siteRows.filter((s) => allowed.has(s.id));
    }
    const base = rows.map((s) => ({ value: String(s.id), label: s.site_name }));
    const sid = existingDetail ? getQuotationSiteId(existingDetail.site) : null;
    const nested = existingDetail ? getQuotationNestedSite(existingDetail.site) : null;
    if (isEdit && sid != null) {
      const exists = base.some((o) => o.value === String(sid));
      if (!exists) {
        const label = nested?.site_name?.trim() || `Site #${sid}`;
        return [{ value: String(sid), label }, ...base];
      }
    }
    return base;
  }, [siteRows, selectedProject, isEdit, existingDetail]);

  const selectedSiteForMap = React.useMemo(() => {
    const raw = siteStr?.trim();
    if (!raw || !/^\d+$/.test(raw)) return null;
    const id = Number.parseInt(raw, 10);
    const fromRows = siteRows.find((s) => s.id === id) ?? null;
    if (fromRows) return fromRows;
    const clientIdForSnapshot =
      effectiveClientId != null && effectiveClientId > 0
        ? effectiveClientId
        : existingDetail
          ? getQuotationCustomerId(existingDetail.customer) ?? 0
          : 0;
    if (isEdit && existingDetail && getQuotationSiteId(existingDetail.site) === id && clientIdForSnapshot > 0) {
      const nested = getQuotationNestedSite(existingDetail.site);
      if (nested) return quotationNestedSiteToSite(nested, clientIdForSnapshot);
    }
    return null;
  }, [siteStr, siteRows, isEdit, existingDetail, effectiveClientId]);

  React.useEffect(() => {
    if (!createFromProjectId || isEdit) return;
    if (projectIdStr !== String(createFromProjectId)) return;
    if (siteStr?.trim()) return;
    if (siteOptions.length === 0) return;
    setValue("site", siteOptions[0].value, { shouldValidate: true, shouldDirty: true });
  }, [createFromProjectId, isEdit, projectIdStr, siteStr, siteOptions, setValue]);

  React.useEffect(() => {
    const selectedSite = getValues("site");
    if (!selectedSite) return;
    const stillExists = siteOptions.some((s) => s.value === selectedSite);
    if (!stillExists) {
      setValue("site", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [siteOptions, getValues, setValue]);

  const projectOptions = React.useMemo<Option[]>(
    () => projectRows.map((p) => ({ value: String(p.id), label: p.name })),
    [projectRows],
  );

  const sortedLevelRows = React.useMemo(() => {
    const rows = Array.isArray(levelRows) ? levelRows : [];
    return [...rows].sort((a, b) => {
      const ao = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
      const bo = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [levelRows]);

  const editDraftSeed = React.useMemo(() => {
    if (!isEdit || !existingDetail) return null;
    return {
      quotationId: existingDetail.id,
      quoteSections: existingDetail.quote_sections ?? [],
    };
  }, [isEdit, existingDetail]);

  const draftEnabled = !isEdit || !!existingDetail;
  const [quoteDraft, setQuoteDraft] = useQuotationDraftState(draftEnabled, projectId, sortedLevelRows, editDraftSeed);

  const noProjects = projectOptions.length === 0;
  const canShowLevels = !!projectId && projectId > 0;

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const quoteNameRegister = register("quote_name");

  async function onSubmit(values: QuotationFormValues) {
    setSaving(true);
    try {
      const basePayload = mapQuotationFormToPayload(values);
      let merged = quoteDraft ? mergeQuotationDraftIntoPayload(basePayload, quoteDraft) : basePayload;
      if (isEdit && !quoteDraft && existingDetail?.quote_sections && existingDetail.quote_sections.length > 0) {
        const computedGrand =
          existingDetail.grand_total ??
          existingDetail.quote_sections.reduce(
            (acc, s) =>
              acc + (typeof s.section_total === "number" && Number.isFinite(s.section_total) ? s.section_total : 0),
            0,
          );
        merged = {
          ...merged,
          quote_sections: existingDetail.quote_sections,
          grand_total: Number.isFinite(computedGrand) ? computedGrand : null,
        };
      }
      const payload = applyQuotationSiteSnapshot(merged, selectedSiteForMap, parseOptionalId(values.site_contact));
      const saved = isEdit && quotationId ? await updateQuotation(quotationId, payload) : await createQuotation(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(mergeUrlQueryParam(safeBack, "highlight", String(saved.id)));
    } catch {
      toastError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? existingDetail?.quote_name ?? t("detail.loadingTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={
          isEdit && existingDetail
            ? t("page.lastUpdated", {
                date: dateFmt.format(new Date(existingDetail.modified_at ?? existingDetail.created_at)),
              })
            : t("page.createSubtitle")
        }
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="md" disabled={saving} onClick={() => router.push(safeBack)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="quotation-form-screen" variant="primary" size="md" loading={saving} disabled={noProjects}>
              {isEdit ? t("page.saveEdit") : t("modal.save")}
            </AppButton>
          </div>
        }
      />
      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loadingExisting ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : screenError ? (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{screenError}</p>
          </div>
        ) : (
          <form id="quotation-form-screen" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(onSubmit)}>
            {noProjects ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                {t("noClientsHint")}
              </p>
            ) : null}
            <AppTabs
              tabs={[
                { id: "project", label: t("formTabs.project") },
                { id: "pricing", label: t("formTabs.pricing") },
              ]}
              value={formTab}
              onValueChange={(id) => setFormTab(id === "pricing" ? "pricing" : "project")}
              ariaLabel={t("formTabs.aria")}
              panelIdPrefix="quotation-form-screen"
            />
            <div
              role="tabpanel"
              id="quotation-form-screen-project"
              aria-labelledby="quotation-form-screen-trigger-project"
              className={cn("space-y-6", formTab !== "project" && "hidden")}
            >
            <div
              className={cn(
                selectedSiteForMap &&
                  "grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8",
              )}
            >
            <div className={cn("min-w-0 space-y-6", selectedSiteForMap && "lg:min-h-0")}>
            <FormFieldRow cols="2">
              <FieldGroup label={t("fields.quoteName")} htmlFor="quotation-name" required>
                <input
                  id="quotation-name"
                  aria-invalid={errors.quote_name ? true : undefined}
                  className={cn(surfaceInputClassName, errors.quote_name && "border-red-500 dark:border-red-500")}
                  {...quoteNameRegister}
                  onBlur={(e) => {
                    quoteNameRegister.onBlur(e);
                    const next = capitalizeFirstLetter(e.target.value);
                    if (next !== e.target.value) setValue("quote_name", next, { shouldValidate: true });
                  }}
                />
                <FieldErrorText>{errors.quote_name?.message}</FieldErrorText>
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
                      disabled={saving || noProjects}
                      invalid={!!errors.project}
                      onBlur={field.onBlur}
                      onChange={(v) => {
                        field.onChange(v);
                        setValue("site", "");
                        setValue("primary_customer_contact", "");
                        setValue("additional_customer_contact", "");
                      }}
                    />
                  )}
                />
                <FieldErrorText>{errors.project?.message}</FieldErrorText>
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
                      disabled
                      invalid={!!errors.customer}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
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
                      disabled={saving || !effectiveClientId || siteOptions.length === 0}
                      invalid={!!errors.site}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FieldErrorText>{errors.site?.message}</FieldErrorText>
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
                      disabled={saving || !effectiveClientId}
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
                      disabled={saving || !effectiveClientId}
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
                      options={salesOptions}
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
                      options={managerOptions}
                      value={field.value}
                      emptyLabel={t("placeholders.userOptional")}
                      disabled={saving}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FieldGroup>
            </FormFieldRow>
            <FormFieldRow cols="2">
              <FieldGroup label={t("fields.tags")} htmlFor="quotation-tags">
                <Controller
                  control={control}
                  name="tag_ids"
                  render={({ field }) => (
                    <MultiCheckSelect
                      id="quotation-tags"
                      options={tagOptions}
                      values={(field.value ?? []).map(String)}
                      onChange={(next) =>
                        field.onChange(next.map((v) => Number.parseInt(v, 10)).filter((n) => Number.isFinite(n) && n > 0))
                      }
                      onBlur={field.onBlur}
                      disabled={saving}
                      listLabel={t("fields.tags")}
                      placeholder={t("placeholders.tags")}
                    />
                  )}
                />
              </FieldGroup>
              <FieldGroup label={t("fields.technicians")} htmlFor="quotation-technicians">
                {technicianOptions.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("hints.noUsers")}</p>
                ) : (
                  <Controller
                    control={control}
                    name="technician_ids"
                    render={({ field }) => (
                      <MultiCheckSelect
                        id="quotation-technicians"
                        options={technicianOptions}
                        values={(field.value ?? []).map(String)}
                        onChange={(next) =>
                          field.onChange(
                            next
                              .map((v) => Number.parseInt(v, 10))
                              .filter((n) => Number.isFinite(n) && n > 0),
                          )
                        }
                        onBlur={field.onBlur}
                        disabled={saving}
                        listLabel={t("fields.technicians")}
                        placeholder={t("placeholders.userOptional")}
                      />
                    )}
                  />
                )}
              </FieldGroup>
            </FormFieldRow>
            <FieldGroup label={t("fields.description")} htmlFor="quotation-desc">
              <textarea id="quotation-desc" rows={3} className={cn(surfaceInputClassName, "min-h-[5rem]")} {...register("description")} />
            </FieldGroup>
            </div>
            {selectedSiteForMap ? (
              <aside className="flex min-h-0 min-w-0 flex-col gap-4 rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-950/30 lg:h-full">
                <div className="shrink-0 space-y-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("selectedSiteMapTitle")}</p>
                  {hasDetailAddress({
                    line1: selectedSiteForMap.address_line_1,
                    line2: selectedSiteForMap.address_line_2,
                    city: selectedSiteForMap.city,
                    state: selectedSiteForMap.state,
                    pincode: selectedSiteForMap.pincode,
                    country: selectedSiteForMap.country,
                  }) ? (
                    <DetailFormattedAddress
                      line1={selectedSiteForMap.address_line_1}
                      line2={selectedSiteForMap.address_line_2}
                      city={selectedSiteForMap.city}
                      state={selectedSiteForMap.state}
                      pincode={selectedSiteForMap.pincode}
                      country={selectedSiteForMap.country}
                      emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">—</p>}
                    />
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("mapNoStructuredAddress")}</p>
                  )}
                </div>
                <AddressMiniMap
                  addressParts={{
                    line1: selectedSiteForMap.address_line_1,
                    line2: selectedSiteForMap.address_line_2,
                    city: selectedSiteForMap.city,
                    state: selectedSiteForMap.state,
                    pincode: selectedSiteForMap.pincode,
                    country: selectedSiteForMap.country,
                  }}
                  className="flex min-h-[200px] flex-1 flex-col"
                  mapClassName="min-h-0 flex-1"
                />
              </aside>
            ) : null}
            </div>
            </div>
            <div
              role="tabpanel"
              id="quotation-form-screen-pricing"
              aria-labelledby="quotation-form-screen-trigger-pricing"
              className={cn(formTab !== "pricing" && "hidden")}
            >
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-100">{t("levels.sectionsTitle")}</p>
                {isEdit && (!existingDetail?.quote_sections || existingDetail.quote_sections.length === 0) ? (
                  <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t("page.editQuoteScopeEmpty")}</p>
                ) : null}
                <QuotationDraftComposer
                  draft={quoteDraft}
                  onDraftChange={setQuoteDraft}
                  saving={saving}
                  canShow={canShowLevels}
                />
              </div>
            </div>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
