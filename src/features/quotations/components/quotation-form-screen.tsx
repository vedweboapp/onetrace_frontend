"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter, usePathname } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import {
  createQuotation,
  fetchProjectLevelRowsForQuotation,
  fetchQuotation,
  updateQuotation,
} from "@/features/quotations/api/quotation.api";
import { QuotationAdditionalContactsFields } from "@/features/quotations/components/quotation-additional-contacts-fields";
import { QuotationDraftComposer } from "@/features/quotations/components/quotation-draft-composer";
import {
  isProjectQuoteCategory,
  isServiceQuoteCategory,
  parseQuoteCategoryParam,
  QUOTE_CATEGORY,
} from "@/features/quotations/constants/quotation-category";
import { useQuotationDraftState } from "@/features/quotations/hooks/use-quotation-draft-state";
import type { ProjectLevelForQuotation, QuotationDetail } from "@/features/quotations/types/quotation.types";
import type { QuotationDraft } from "@/features/quotations/types/quotation-draft.types";
import { mergeQuotationDraftIntoPayload } from "@/features/quotations/utils/quotation-draft-payload.util";
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
  getQuotationProjectId,
  getQuotationSiteId,
  getQuotationSiteIds,
  quotationNestedSiteToSite,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import {
  QUOTATION_STATUS_OPTIONS,
} from "@/features/quotations/utils/quotation-status.util";
import { siteHasMapableLocation, siteToAddressMapPoint } from "@/features/quotations/utils/quotation-site-map.util";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { fetchSite, fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { fetchTagsPage } from "@/features/tags/api/tag.api";
import type { Tag } from "@/features/tags/types/tag.types";
import {
  fetchUsersForAppRoles,
  userProfilesToSelectOptions,
} from "@/features/users/utils/load-users-by-role.util";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import {
  DetailPageMapLayout,
  detailMapFillClassName,
  detailMapFormGridClassName,
} from "@/shared/components/layout/detail-page-map-layout";
import { DetailTabStepNav } from "@/shared/components/layout/detail-tab-step-nav";
import { routes } from "@/shared/config/routes";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { buildEntityDetailHrefAfterSave, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import {
  clearQuickCreateFormDraft,
  saveQuickCreateFormDraft,
} from "@/shared/utils/quick-create-form-draft.util";
import { useQuotationFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import {
  AppButton,
  AppTabs,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  MultiCheckSelect,
  SurfaceDateInput,
  SurfaceShell,
  surfaceInputClassName,
  surfaceTextareaClassName,
} from "@/shared/ui";

const AddressMultiMiniMap = dynamic(
  () => import("@/shared/components/maps/address-multi-mini-map").then((m) => m.AddressMultiMiniMap),
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

type QuotationFormDraftBundle = {
  values: QuotationFormValues;
  quoteDraft?: QuotationDraft | null;
  formTab?: "project" | "pricing";
};

function isQuotationFormDraftBundle(draft: unknown): draft is QuotationFormDraftBundle {
  return !!draft && typeof draft === "object" && "values" in draft;
}

function parseFormIdField(raw: string | undefined): number | undefined {
  const s = raw?.trim() ?? "";
  if (!s || !/^\d+$/.test(s)) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function QuotationFormScreen({ mode, quotationId }: Props) {
  const t = useTranslations("Dashboard.quotations");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = useQuotationFormBackUrl();
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

  const createQuoteCategory = React.useMemo(() => {
    if (isEdit) return undefined;
    return parseQuoteCategoryParam(searchParams.get("quote_category"));
  }, [isEdit, searchParams]);

  /** Create: `quote_category` (or `?project=`) selects service vs project UI. Edit: from saved quote. */
  const isServiceQuotation = React.useMemo(() => {
    if (!isEdit) {
      if (createFromProjectId != null) return false;
      if (createQuoteCategory) return isServiceQuoteCategory(createQuoteCategory);
      return true;
    }
    if (!existingDetail) return false;
    const cat = existingDetail.quote_category ?? existingDetail.category;
    if (isServiceQuoteCategory(cat)) return true;
    if (isProjectQuoteCategory(cat)) return false;
    return getQuotationProjectId(existingDetail.project) == null;
  }, [isEdit, createFromProjectId, createQuoteCategory, existingDetail]);

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
  const [formTab, setFormTab] = React.useState<"project" | "pricing">(() =>
    searchParams.get("tab") === "pricing" ? "pricing" : "project",
  );

  const draftReturnTo = React.useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const quoteDraftSnapshotRef = React.useRef<QuotationDraft | null>(null);
  const formTabSnapshotRef = React.useRef<"project" | "pricing">("project");
  const setQuoteDraftRef = React.useRef<React.Dispatch<React.SetStateAction<QuotationDraft | null>> | null>(null);
  const preventQuoteDraftSeedRef = React.useRef(false);
  const skipPresetFromUrlRef = React.useRef(false);

  React.useEffect(() => {
    setFormTab(searchParams.get("tab") === "pricing" ? "pricing" : "project");
  }, [mode, quotationId, searchParams]);

  const schema = React.useMemo(
    () =>
      createQuotationFormSchema(
        {
          quoteName: t("validation.quoteName"),
          customer: t("validation.customer"),
          sites: t("validation.sites"),
          project: t("validation.project"),
        },
        // Project required only for project quotations; validated in onSubmit so edit load can flip category.
        { requireProject: false },
      ),
    [t],
  );

  const {
    control,
    register,
    reset,
    setValue,
    setError,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyQuotationFormDefaults(),
    shouldUnregister: false,
  });

  const getFormDraft = React.useCallback(
    () => ({
      values: getValues(),
      quoteDraft: quoteDraftSnapshotRef.current,
      formTab: formTabSnapshotRef.current,
    }),
    [getValues],
  );
  const restoreFormDraft = React.useCallback(
    (draft: unknown) => {
      skipPresetFromUrlRef.current = true;
      if (isQuotationFormDraftBundle(draft)) {
        reset(draft.values, { keepDefaultValues: false });
        if (draft.formTab) setFormTab(draft.formTab);
        if (draft.quoteDraft !== undefined) {
          preventQuoteDraftSeedRef.current = true;
          setQuoteDraftRef.current?.(draft.quoteDraft);
        }
        return;
      }
      reset(draft as QuotationFormValues, { keepDefaultValues: false });
    },
    [reset],
  );

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
  const sitesStr = useWatch({ control, name: "sites" });
  const customerId =
    customerIdStr && /^\d+$/.test(customerIdStr.trim())
      ? Number.parseInt(customerIdStr.trim(), 10)
      : undefined;
  const projectId =
    projectIdStr && /^\d+$/.test(projectIdStr.trim())
      ? Number.parseInt(projectIdStr.trim(), 10)
      : undefined;

  const clientQuickCreate = useQuickCreate({
    kind: "client",
    returnTo: draftReturnTo,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });

  const projectQuickCreate = useQuickCreate({
    kind: "project",
    clientId: customerId,
    addDisabled: saving || !customerId,
    returnTo: draftReturnTo,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });

  const siteQuickCreate = useQuickCreate({
    kind: "site",
    clientId: customerId,
    addDisabled: saving || !customerId,
    returnTo: draftReturnTo,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });

  const contactQuickCreate = useQuickCreate({
    kind: "contact",
    clientId: customerId,
    addDisabled: saving || !customerId,
    returnTo: draftReturnTo,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const pendingAdditionalContactRowRef = React.useRef<number | null>(null);
  const openUsersSettings = React.useCallback(() => {
    const current = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : routes.dashboard.quotations;
    if (!isEdit) saveQuickCreateFormDraft(draftReturnTo, getFormDraft());
    router.push(buildPathWithStoredBack(`${routes.dashboard.settingsUsers}/new`, current));
  }, [router, isEdit, draftReturnTo, getFormDraft]);
  const openTagsSettings = React.useCallback(() => {
    router.push(routes.dashboard.settingsTags);
  }, [router]);
  const appliedFromProjectIdRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!createFromProjectId) {
      appliedFromProjectIdRef.current = null;
    }
  }, [createFromProjectId]);

  React.useEffect(() => {
    if (isEdit || !createFromProjectId || skipPresetFromUrlRef.current) return;
    if (appliedFromProjectIdRef.current === createFromProjectId) return;
    if (projectRows.length === 0) return;
    const row = projectRows.find((p) => p.id === createFromProjectId);
    if (!row) {
      appliedFromProjectIdRef.current = createFromProjectId;
      return;
    }
    const clientId = getProjectClientId(row);
    if (clientId) {
      setValue("customer", String(clientId), { shouldValidate: true, shouldDirty: true });
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
        const filters: { is_active: true; client?: number } = { is_active: true };
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
  }, [customerId]);

  React.useEffect(() => {
    let cancelled = false;
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
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    if (isServiceQuotation) {
      if (!customerId || customerId <= 0) {
        setSiteRows([]);
        return;
      }
      (async () => {
        try {
          const { items } = await fetchSitesPage(1, 500, { client: customerId, is_active: true });
          if (!cancelled) setSiteRows(items);
        } catch {
          if (!cancelled) setSiteRows([]);
        }
      })();
    } else {
      if (!projectId || projectId <= 0) {
        setSiteRows([]);
        return;
      }
      (async () => {
        try {
          const { items } = await fetchSitesPage(1, 500, { project: projectId, is_active: true });
          if (!cancelled) setSiteRows(items);
        } catch {
          if (!cancelled) setSiteRows([]);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [isServiceQuotation, customerId, projectId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!customerId || customerId <= 0) {
      setContactOptions([]);
      return;
    }
    (async () => {
      try {
        const { items } = await fetchContactsPage(1, 500, { client: customerId, is_active: true });
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
  }, [customerId]);

  React.useEffect(() => {
    const selectedProject = getValues("project")?.trim();
    if (!selectedProject || !customerId) return;
    const stillExists = projectRows.some((p) => String(p.id) === selectedProject);
    if (!stillExists) {
      if (isEdit && existingDetail) {
        const pid = getQuotationProjectId(existingDetail.project);
        if (pid != null && String(pid) === selectedProject) return;
      }
      setValue("project", "", { shouldDirty: true, shouldValidate: true });
      setValue("sites", [], { shouldDirty: true, shouldValidate: true });
    }
  }, [projectRows, customerId, getValues, setValue, isEdit, existingDetail]);

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
    const base = siteRows.map((s) => ({ value: String(s.id), label: s.site_name }));
    if (!isEdit || !existingDetail) return base;
    const extraIds = getQuotationSiteIds(existingDetail);
    const merged = [...base];
    for (const sid of extraIds) {
      if (merged.some((o) => o.value === String(sid))) continue;
      const fromList = existingDetail.sites?.find((row) => row.id === sid);
      const nested =
        getQuotationSiteId(existingDetail.site) === sid
          ? getQuotationNestedSite(existingDetail.site)
          : null;
      const label = fromList?.site_name?.trim() || nested?.site_name?.trim() || `Site #${sid}`;
      merged.unshift({ value: String(sid), label });
    }
    return merged;
  }, [siteRows, isEdit, existingDetail]);

  const selectedSiteIdsKey = React.useMemo(() => {
    return (sitesStr ?? [])
      .map((raw) => Number.parseInt(String(raw).trim(), 10))
      .filter((id) => Number.isFinite(id) && id > 0)
      .join(",");
  }, [sitesStr]);

  const [selectedSitesForMap, setSelectedSitesForMap] = React.useState<Site[]>([]);

  React.useEffect(() => {
    const ids = selectedSiteIdsKey
      ? selectedSiteIdsKey.split(",").map((raw) => Number.parseInt(raw, 10)).filter((id) => Number.isFinite(id) && id > 0)
      : [];
    if (ids.length === 0) {
      setSelectedSitesForMap([]);
      return;
    }

    const clientIdForSnapshot =
      customerId != null && customerId > 0
        ? customerId
        : existingDetail
          ? getQuotationCustomerId(existingDetail.customer) ?? 0
          : 0;

    let cancelled = false;
    void (async () => {
      const rows = await Promise.all(
        ids.map(async (id) => {
          const fromRows = siteRows.find((s) => s.id === id) ?? null;
          if (fromRows && siteHasMapableLocation(fromRows)) return fromRows;

          if (isEdit && existingDetail && getQuotationSiteId(existingDetail.site) === id && clientIdForSnapshot > 0) {
            const nested = getQuotationNestedSite(existingDetail.site);
            if (nested && siteHasMapableLocation(nested)) {
              return quotationNestedSiteToSite(nested, clientIdForSnapshot);
            }
          }

          const fromSnapshots = [
            ...(existingDetail?.site_snapshots ?? []),
            ...(existingDetail?.site_snapshot ? [existingDetail.site_snapshot] : []),
          ];
          const snap = fromSnapshots.find((row) => row.id === id);
          if (snap && clientIdForSnapshot > 0 && siteHasMapableLocation(snap)) {
            return quotationNestedSiteToSite(snap, clientIdForSnapshot);
          }

          try {
            return await fetchSite(id);
          } catch {
            return fromRows;
          }
        }),
      );
      if (!cancelled) {
        setSelectedSitesForMap(rows.filter((row): row is Site => row != null));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSiteIdsKey, siteRows, isEdit, existingDetail, customerId]);

  const selectedSiteMapPoints = React.useMemo(
    () => selectedSitesForMap.map((site) => siteToAddressMapPoint(site)),
    [selectedSitesForMap],
  );

  React.useEffect(() => {
    const sitesSourceReady = isServiceQuotation
      ? customerId != null && customerId > 0
      : projectId != null && projectId > 0;
    if (!sitesSourceReady) return;
    if ((sitesStr ?? []).length > 0) return;
    if (siteOptions.length !== 1) return;
    setValue("sites", [siteOptions[0].value], { shouldValidate: true, shouldDirty: true });
  }, [isServiceQuotation, customerId, projectId, sitesStr, siteOptions, setValue]);

  React.useEffect(() => {
    const selectedSites = getValues("sites") ?? [];
    if (selectedSites.length === 0) return;
    const valid = new Set(siteOptions.map((s) => s.value));
    const next = selectedSites.filter((id) => valid.has(id));
    if (next.length !== selectedSites.length) {
      setValue("sites", next, { shouldDirty: true, shouldValidate: true });
    }
  }, [siteOptions, getValues, setValue]);

  const projectOptions = React.useMemo<Option[]>(() => {
    const base = projectRows.map((p) => ({ value: String(p.id), label: p.name }));
    const pid = existingDetail ? getQuotationProjectId(existingDetail.project) : null;
    const nested =
      existingDetail?.project && typeof existingDetail.project === "object"
        ? existingDetail.project
        : null;
    if (isEdit && pid != null) {
      const exists = base.some((o) => o.value === String(pid));
      if (!exists) {
        const label = nested?.name?.trim() || `Project #${pid}`;
        return [{ value: String(pid), label }, ...base];
      }
    }
    return base;
  }, [projectRows, isEdit, existingDetail]);

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
  const [quoteDraft, setQuoteDraft] = useQuotationDraftState(
    draftEnabled,
    projectId,
    sortedLevelRows,
    editDraftSeed,
    {
      preventAutoSeedRef: preventQuoteDraftSeedRef,
      emptyWhenNoProject: isServiceQuotation,
    },
  );

  setQuoteDraftRef.current = setQuoteDraft;
  quoteDraftSnapshotRef.current = quoteDraft;
  formTabSnapshotRef.current = formTab;

  useQuickCreateReturn({
    restoreFormDraft: !isEdit ? restoreFormDraft : undefined,
    onReloadOptions: async () => {
      const values = getValues();
      const reloadCustomerId = parseFormIdField(values.customer);
      const reloadProjectId = parseFormIdField(values.project);
      const { items: clients } = await fetchClientsPage(1, 500, { is_active: true });
      setClientOptions(clients.map((c) => ({ value: String(c.id), label: c.name })));
      if (reloadCustomerId) {
        const [projects, contacts] = await Promise.all([
          fetchProjectsPage(1, 500, { client: reloadCustomerId, is_active: true }),
          fetchContactsPage(1, 500, { client: reloadCustomerId, is_active: true }),
        ]);
        setProjectRows(projects.items);
        setContactOptions(contacts.items.map((c) => ({ value: String(c.id), label: c.name })));
      }
      if (isServiceQuotation && reloadCustomerId) {
        const { items } = await fetchSitesPage(1, 500, { client: reloadCustomerId, is_active: true });
        setSiteRows(items);
      } else if (reloadProjectId) {
        const { items } = await fetchSitesPage(1, 500, { project: reloadProjectId, is_active: true });
        setSiteRows(items);
      }
    },
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget === "client") {
        setValue("customer", selectId, { shouldDirty: true, shouldValidate: true });
        setValue("project", "", { shouldDirty: true, shouldValidate: true });
        setValue("sites", [], { shouldDirty: true, shouldValidate: true });
        setValue("primary_customer_contact", "", { shouldDirty: true });
        setValue("additional_customer_contacts", [], { shouldDirty: true });
        setValue("site_contact", "", { shouldDirty: true });
        return;
      }
      if (selectTarget === "project") {
        setValue("project", selectId, { shouldDirty: true, shouldValidate: true });
        setValue("sites", [], { shouldDirty: true, shouldValidate: true });
        setValue("site_contact", "", { shouldDirty: true });
        return;
      }
      if (selectTarget === "site") {
        const current = getValues("sites") ?? [];
        if (!current.includes(selectId)) {
          setValue("sites", [...current, selectId], { shouldDirty: true, shouldValidate: true });
        }
        return;
      }
      if (selectTarget === "contact") {
        const rowIdx = pendingAdditionalContactRowRef.current;
        if (rowIdx != null) {
          setValue(`additional_customer_contacts.${rowIdx}.contact`, selectId, {
            shouldDirty: true,
            shouldValidate: true,
          });
          pendingAdditionalContactRowRef.current = null;
        } else {
          setValue("primary_customer_contact", selectId, { shouldDirty: true, shouldValidate: true });
        }
      }
    },
  });

  const noClients = clientOptions.length === 0;
  const noProjects = !customerId || projectOptions.length === 0;
  const canShowLevels = isServiceQuotation ? true : !!projectId && projectId > 0;

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
    if (!isServiceQuotation && parseOptionalId(values.project) == null) {
      setError("project", { type: "manual", message: t("validation.project") });
      setFormTab("project");
      return;
    }
    setSaving(true);
    try {
      const basePayload = mapQuotationFormToPayload(values, {
        quote_category: isServiceQuotation ? QUOTE_CATEGORY.service : QUOTE_CATEGORY.project,
      });
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
      const payload = merged;
      const saved = isEdit && quotationId ? await updateQuotation(quotationId, payload) : await createQuotation(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      if (!isEdit) clearQuickCreateFormDraft(draftReturnTo);
      router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.quotations, saved.id, safeBack));
    } catch (error) {
      reportFormSubmitApiError(error, setError, t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? (existingDetail?.quote_name ?? t("page.editTitle")) : t("page.createTitle")}
        titleLoading={isEdit && loadingExisting && !existingDetail}
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
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(safeBack ?? routes.dashboard.quotations)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="quotation-form-screen" variant="primary" size="sm" loading={saving} disabled={isServiceQuotation ? noClients : noProjects}>
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
            {/* {noProjects ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                {t("noClientsHint")}
              </p>
            ) : null} */}
            <AppTabs
              tabs={[
                { id: "project", label: t(isServiceQuotation ? "formTabs.details" : "formTabs.project") },
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
            <DetailPageMapLayout
              showMap
              mapFillHeight
              gridClassName={detailMapFormGridClassName}
              mapTitle={t("detail.sectionMap")}
              map={
                <AddressMultiMiniMap
                  points={selectedSiteMapPoints}
                  className={detailMapFillClassName}
                  mapClassName="h-full min-h-0 flex-1"
                />
              }
            >
            <div className="space-y-6">
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
                      searchable
                      listLabel={t("fields.customer")}
                      options={clientOptions}
                      value={field.value}
                      emptyLabel={t("placeholders.customer")}
                      disabled={saving || noClients}
                      invalid={!!errors.customer}
                      onBlur={field.onBlur}
                      onAdd={clientQuickCreate.onAdd}
                      addAriaLabel={clientQuickCreate.addAriaLabel}
                      addLabel={clientQuickCreate.addLabel}
                      onChange={(v) => {
                        field.onChange(v);
                        setValue("project", "");
                        setValue("sites", []);
                        setValue("primary_customer_contact", "");
                        setValue("additional_customer_contacts", []);
                        setValue("site_contact", "");
                      }}
                    />
                  )}
                />
                <FieldErrorText>{errors.customer?.message}</FieldErrorText>
              </FieldGroup>
              {!isServiceQuotation ? (
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
                      disabled={saving || !customerId || noProjects}
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
              ) : null}
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
                      disabled={
                        saving ||
                        (isServiceQuotation ? !customerId : !projectId) ||
                        siteOptions.length === 0
                      }
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
                      searchable
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
            {isEdit ? (
              <FormFieldRow cols="2">
                <FieldGroup label={t("fields.orderNumber")} htmlFor="quotation-order">
                  <input id="quotation-order" className={surfaceInputClassName} {...register("order_number")} />
                </FieldGroup>
                <FieldGroup label={t("table.status")} htmlFor="quotation-status">
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <CheckmarkSelect
                        id="quotation-status"
                        portaled
                        listLabel={t("table.status")}
                        options={QUOTATION_STATUS_OPTIONS.map((row) => ({
                          value: row.value,
                          label: t(row.labelKey),
                        }))}
                        value={field.value}
                        emptyLabel={t("updateStatus.placeholder")}
                        disabled={saving}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </FieldGroup>
              </FormFieldRow>
            ) : null}
            <FormFieldRow cols="2">
              <FieldGroup label={t("fields.salesperson")} htmlFor="quotation-sales">
                <Controller
                  control={control}
                  name="salesperson"
                  render={({ field }) => (
                    <CheckmarkSelect
                      id="quotation-sales"
                      portaled
                      searchable
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
                      searchable
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
                      onAdd={openTagsSettings}
                      addAriaLabel="Add tag"
                      addLabel="Add new"
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
                {...register("description")}
              />
            </FieldGroup>
            </div>
            </DetailPageMapLayout>
            <DetailTabStepNav onNext={() => setFormTab("pricing")} nextLabel={t("formTabs.nextToPricing")} />
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
                  allowManualLines={isServiceQuotation}
                />
              </div>
              <DetailTabStepNav onPrev={() => setFormTab("project")} prevLabel={t(isServiceQuotation ? "formTabs.prevToDetails" : "formTabs.prevToProject")} />
            </div>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
