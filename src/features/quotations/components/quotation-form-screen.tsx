"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { useRouter, usePathname } from "@/i18n/navigation";
import { fetchClient, fetchClientsPage } from "@/features/clients/api/client.api";
import { clientToSelectOption, clientsToSelectOptions } from "@/features/clients/utils/client-select-options.util";
import { fetchContact, fetchContactsPage } from "@/features/contacts/api/contact.api";
import { formatContactOptionLabel } from "@/features/contacts/utils/contact-name.util";
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
import { sumQuoteSectionsGrandTotal } from "@/features/quotations/utils/quotation-draft-compute.util";
import {
  clearTakenQuotationSectionScopeDraft,
  clearQuotationSectionScopeSession,
  consumeQuotationSectionScopeDraft,
  readQuotationSectionScopeSession,
} from "@/features/quotations/utils/quotation-section-scope.util";
import { isOptionalQuoteSection } from "@/features/quotations/utils/quotation-section-type.util";
import {
  clearQuotationWorkingDraft,
  consumeQuotationFreshCreate,
  readQuotationFormValuesDraft,
  readQuotationWorkingDraft,
  writeQuotationFormValuesDraft,
  writeQuotationWorkingDraft,
  type QuotationWorkingDraftKey,
} from "@/features/quotations/utils/quotation-working-draft.util";
import { buildQuotationScopeReturnHref } from "@/features/quotations/utils/quotation-block-scope.util";
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
  getQuotationContactId,
  getQuotationCustomerId,
  getQuotationNestedSite,
  getQuotationOptionalUserId,
  getQuotationProjectId,
  getQuotationSiteId,
  quotationContactLabel,
  quotationCustomerLabel,
  quotationNestedSiteToSite,
  quotationUserLabel,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import {
  QUOTATION_STATUS_OPTIONS,
} from "@/features/quotations/utils/quotation-status.util";
import {
  fetchQuotationSiteRows,
  mergeQuotationSiteOptionRows,
  type QuotationSiteOptionRow,
} from "@/features/quotations/utils/quotation-site-options.util";
import { siteHasMapableLocation, siteToAddressMapPoint } from "@/features/quotations/utils/quotation-site-map.util";
import { fetchProject, fetchProjectsPage } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { fetchSite } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { fetchTagsPage } from "@/features/tags/api/tag.api";
import type { Tag } from "@/features/tags/types/tag.types";
import { fetchUserProfile } from "@/features/users/api/user.api";
import {
  fetchUsersForAppRoles,
  invalidateUsersByRoleCache,
  resolveUserProfileSelectId,
  userProfileSelectLabel,
  userProfilesToSelectOptions,
} from "@/features/users/utils/load-users-by-role.util";
import { useDropdownCatalogEpoch } from "@/shared/catalog/use-dropdown-catalog-epoch";
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
import { useTabOrderStorageKey } from "@/shared/hooks/use-tab-order-storage-key";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import {
  clearQuickCreateFormDraft,
  loadQuickCreateFormDraft,
  saveQuickCreateFormDraft,
  peekQuickCreateFieldTarget,
  storeQuickCreateFieldTarget,
} from "@/shared/utils/quick-create-form-draft.util";
import { isQuickCreateKind } from "@/shared/types/quick-create.types";
import {
  QUICK_CREATE_SELECT_PARAM,
  QUICK_CREATE_SELECT_TARGET_PARAM,
} from "@/shared/utils/quick-create-navigation.util";
import { useQuotationFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import {
  AppButton,
  CustomizableAppTabs,
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
  const tabsStorageKey = useTabOrderStorageKey("quotationForm");
  const isEdit = mode === "edit";
  const catalogEpoch = useDropdownCatalogEpoch([
    "users",
    "clients",
    "contacts",
    "sites",
    "projects",
    "tags",
  ]);

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
  const [siteRows, setSiteRows] = React.useState<QuotationSiteOptionRow[]>([]);
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
    const params = new URLSearchParams(searchParams.toString());
    params.delete(QUICK_CREATE_SELECT_PARAM);
    params.delete(QUICK_CREATE_SELECT_TARGET_PARAM);
    // Keep service vs project context stable across quick-create round-trips.
    if (!isEdit && !params.get("quote_category")) {
      params.set(
        "quote_category",
        createFromProjectId != null || isProjectQuoteCategory(createQuoteCategory)
          ? QUOTE_CATEGORY.project
          : QUOTE_CATEGORY.service,
      );
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams, isEdit, createFromProjectId, createQuoteCategory]);

  const quoteDraftSnapshotRef = React.useRef<QuotationDraft | null>(null);
  const formTabSnapshotRef = React.useRef<"project" | "pricing">("project");
  const setQuoteDraftRef = React.useRef<React.Dispatch<React.SetStateAction<QuotationDraft | null>> | null>(null);
  const preventQuoteDraftSeedRef = React.useRef(false);
  const skipPresetFromUrlRef = React.useRef(false);
  /** When true, skip pagehide persistence (Cancel / successful Save already cleared storage). */
  const discardDraftsRef = React.useRef(false);

  const workingDraftKey = React.useMemo<QuotationWorkingDraftKey>(
    () => (isEdit && quotationId ? quotationId : "new"),
    [isEdit, quotationId],
  );

  /** Section return + in-progress edit draft — restore before auto-seed can wipe sections. */
  const restoredDraftRef = React.useRef<QuotationDraft | null | undefined>(undefined);
  if (restoredDraftRef.current === undefined) {
    const returningFromQuickCreate = Boolean(
      searchParams.get(QUICK_CREATE_SELECT_PARAM) &&
        searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM),
    );
    const freshCreate = !isEdit && !returningFromQuickCreate && consumeQuotationFreshCreate();
    if (freshCreate) {
      // Brand-new create from list — drop abandoned working / section / QC drafts.
      clearQuotationWorkingDraft(workingDraftKey);
      clearQuotationSectionScopeSession();
      clearQuickCreateFormDraft(draftReturnTo);
      clearQuickCreateFormDraft(buildQuotationScopeReturnHref(pathname));
      restoredDraftRef.current = null;
    } else {
      const fromSection = consumeQuotationSectionScopeDraft();
      const fromWorking = readQuotationWorkingDraft(workingDraftKey);
      restoredDraftRef.current = fromSection ?? fromWorking;
      if (restoredDraftRef.current) {
        preventQuoteDraftSeedRef.current = true;
        // Persist before Strict Mode remount / clearTaken can drop the in-memory take.
        writeQuotationWorkingDraft(workingDraftKey, restoredDraftRef.current);
      }
    }
  }

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

  const persistFormDraft = React.useCallback(() => {
    if (discardDraftsRef.current) return;
    const draft = quoteDraftSnapshotRef.current;
    if (draft) writeQuotationWorkingDraft(workingDraftKey, draft);
    const bundle = { ...getFormDraft(), formTab: "pricing" as const };
    // Stable key — survives tab query param order changes on section return.
    writeQuotationFormValuesDraft(workingDraftKey, bundle);
    saveQuickCreateFormDraft(draftReturnTo, bundle);
    saveQuickCreateFormDraft(buildQuotationScopeReturnHref(pathname), bundle);
  }, [getFormDraft, draftReturnTo, pathname, workingDraftKey]);

  React.useEffect(() => {
    const persist = () => persistFormDraft();
    window.addEventListener("pagehide", persist);
    return () => window.removeEventListener("pagehide", persist);
  }, [persistFormDraft]);
  const formValuesRestoredRef = React.useRef(false);

  const mergeQuickCreateSelectIntoValues = React.useCallback(
    (values: QuotationFormValues): QuotationFormValues => {
      const selectId = searchParams.get(QUICK_CREATE_SELECT_PARAM);
      const selectTarget = searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM);
      if (!selectId || !/^\d+$/.test(selectId) || !isQuickCreateKind(selectTarget)) return values;

      const next = { ...values };
      if (selectTarget === "client") {
        next.customer = selectId;
        return next;
      }
      if (selectTarget === "project") {
        next.project = selectId;
        return next;
      }
      if (selectTarget === "site") {
        const sites = next.sites ?? [];
        next.sites = sites.includes(selectId) ? sites : [...sites, selectId];
        return next;
      }
      if (selectTarget === "contact") {
        const fieldTarget = peekQuickCreateFieldTarget(draftReturnTo) ?? "primary_customer_contact";
        const additionalMatch = /^additional_customer_contacts\.(\d+)$/.exec(fieldTarget);
        if (additionalMatch) {
          const rowIdx = Number.parseInt(additionalMatch[1] ?? "", 10);
          if (Number.isFinite(rowIdx) && rowIdx >= 0) {
            const rows = [...(next.additional_customer_contacts ?? [])];
            while (rows.length <= rowIdx) rows.push({ contact: "" });
            rows[rowIdx] = { ...rows[rowIdx], contact: selectId };
            next.additional_customer_contacts = rows;
            return next;
          }
        }
        next.primary_customer_contact = selectId;
        return next;
      }
      if (selectTarget === "user") {
        const fieldTarget = peekQuickCreateFieldTarget(draftReturnTo) ?? "project_manager";
        if (fieldTarget === "salesperson") {
          next.salesperson = selectId;
          return next;
        }
        if (fieldTarget === "technician_ids") {
          const numericId = Number.parseInt(selectId, 10);
          if (Number.isFinite(numericId) && numericId > 0) {
            const current = next.technician_ids ?? [];
            next.technician_ids = current.includes(numericId) ? current : [...current, numericId];
          }
          return next;
        }
        next.project_manager = selectId;
      }
      return next;
    },
    [draftReturnTo, searchParams],
  );

  const restoreFormDraft = React.useCallback(
    (draft: unknown) => {
      skipPresetFromUrlRef.current = true;
      if (isQuotationFormDraftBundle(draft)) {
        formValuesRestoredRef.current = true;
        reset(mergeQuickCreateSelectIntoValues(draft.values), { keepDefaultValues: false });
        if (draft.formTab) setFormTab(draft.formTab);
        // Section Done restores the latest scope draft first — never overwrite it with a
        // stale quick-create snapshot taken before labour/materials were edited.
        if (draft.quoteDraft !== undefined && restoredDraftRef.current == null) {
          preventQuoteDraftSeedRef.current = true;
          setQuoteDraftRef.current?.(draft.quoteDraft);
        }
        return;
      }
      formValuesRestoredRef.current = true;
      reset(mergeQuickCreateSelectIntoValues(draft as QuotationFormValues), { keepDefaultValues: false });
    },
    [mergeQuickCreateSelectIntoValues, reset],
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
          // Keep Details values restored after Scope & pricing section navigation.
          if (!formValuesRestoredRef.current) {
            reset(mapQuotationDetailToFormDefaults(row));
          }
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
    contactType: "client",
    addDisabled: saving || !customerId,
    returnTo: draftReturnTo,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const addPrimaryContact = React.useCallback(() => {
    storeQuickCreateFieldTarget(draftReturnTo, "primary_customer_contact");
    contactQuickCreate.onAdd?.();
  }, [draftReturnTo, contactQuickCreate.onAdd]);
  const salespersonQuickCreate = useQuickCreate({
    kind: "user",
    appRole: "sales",
    fieldTarget: "salesperson",
    returnTo: draftReturnTo,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const projectManagerQuickCreate = useQuickCreate({
    kind: "user",
    appRole: "manager",
    fieldTarget: "project_manager",
    returnTo: draftReturnTo,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const technicianQuickCreate = useQuickCreate({
    kind: "user",
    appRole: "technician",
    fieldTarget: "technician_ids",
    returnTo: draftReturnTo,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const openTagsSettings = React.useCallback(() => {
    router.push(routes.dashboard.settingsTags);
  }, [router]);

  const ensureClientInOptions = React.useCallback(async (clientIdValue: number) => {
    if (!Number.isFinite(clientIdValue) || clientIdValue <= 0) return String(clientIdValue);
    const value = String(clientIdValue);
    setClientOptions((prev) => {
      if (prev.some((opt) => opt.value === value)) return prev;
      return [...prev, { value, label: `#${clientIdValue}` }];
    });
    try {
      const client = await fetchClient(clientIdValue, { silent: true });
      const next = clientToSelectOption(client);
      setClientOptions((prev) => {
        const idx = prev.findIndex((opt) => opt.value === next.value);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = next;
          return copy;
        }
        return [...prev, next];
      });
      return next.value;
    } catch {
      return value;
    }
  }, []);

  const ensureProjectInOptions = React.useCallback(async (projectIdValue: number) => {
    if (!Number.isFinite(projectIdValue) || projectIdValue <= 0) return String(projectIdValue);
    const value = String(projectIdValue);
    setProjectRows((prev) => {
      if (prev.some((row) => String(row.id) === value)) return prev;
      return [{ id: projectIdValue, name: `Project #${projectIdValue}` } as Project, ...prev];
    });
    try {
      const project = await fetchProject(projectIdValue);
      setProjectRows((prev) => {
        const idx = prev.findIndex((row) => row.id === project.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = project;
          return copy;
        }
        return [project, ...prev];
      });
      return String(project.id);
    } catch {
      return value;
    }
  }, []);

  const ensureContactInOptions = React.useCallback(async (contactId: number) => {
    if (!Number.isFinite(contactId) || contactId <= 0) return;
    setContactOptions((prev) => {
      if (prev.some((opt) => opt.value === String(contactId))) return prev;
      return [...prev, { value: String(contactId), label: `#${contactId}` }];
    });
    try {
      const contact = await fetchContact(contactId);
      const label = formatContactOptionLabel(contact);
      setContactOptions((prev) => {
        const value = String(contact.id);
        const next = { value, label };
        const idx = prev.findIndex((opt) => opt.value === value);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = next;
          return copy;
        }
        return [...prev, next];
      });
    } catch {
      // Keep placeholder so the selection chip survives option reloads.
    }
  }, []);

  const ensureUserInRoleOptions = React.useCallback(
    async (
      userId: number,
      role: "sales" | "manager" | "technician",
    ): Promise<string> => {
      const fallback = String(userId);
      const setOptions =
        role === "sales" ? setSalesOptions : role === "manager" ? setManagerOptions : setTechnicianOptions;
      setOptions((prev) => {
        if (prev.some((opt) => opt.value === fallback)) return prev;
        return [...prev, { value: fallback, label: `#${userId}` }];
      });
      try {
        const user = await fetchUserProfile(userId);
        const value = String(resolveUserProfileSelectId(user));
        const label = userProfileSelectLabel(user);
        setOptions((prev) => {
          const next = { value, label };
          const idx = prev.findIndex((opt) => opt.value === value || opt.value === fallback);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          }
          return [...prev, next];
        });
        return value;
      } catch {
        return fallback;
      }
    },
    [],
  );
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
        const { items: clients } = await fetchClientsPage(1, 20, { is_active: true, dropdown: true });
        if (cancelled) return;
        setClientOptions((prev) => {
          const incoming = clientsToSelectOptions(clients);
          const selectedId = getValues("customer")?.trim() ?? "";
          if (!selectedId) return incoming;
          if (incoming.some((opt) => opt.value === selectedId)) return incoming;
          const kept = prev.find((opt) => opt.value === selectedId);
          return kept ? [kept, ...incoming] : incoming;
        });
      } catch {
        if (!cancelled) setClientOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogEpoch, getValues]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchTagsPage(1, 20, { is_active: true, dropdown: true });
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
  }, [catalogEpoch]);

  const projectCustomerRef = React.useRef(customerId);
  React.useEffect(() => {
    if (projectCustomerRef.current === customerId) return;
    projectCustomerRef.current = customerId;
    setProjectRows([]);
  }, [customerId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const filters: { is_active?: boolean; client?: number } = { is_active: true };
        if (customerId && customerId > 0) filters.client = customerId;
        const { items: projects } = await fetchProjectsPage(1, 20, { ...filters, dropdown: true });
        if (!cancelled) setProjectRows(projects);
      } catch {
        if (!cancelled) setProjectRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, catalogEpoch]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const byRole = await fetchUsersForAppRoles(["technician", "sales", "manager"]);
        if (cancelled) return;
        const mergeSelected = (
          incoming: Option[],
          selectedIds: string[],
          prev: Option[],
        ): Option[] => {
          const merged = [...incoming];
          for (const id of selectedIds) {
            if (!id || merged.some((opt) => opt.value === id)) continue;
            const kept = prev.find((opt) => opt.value === id);
            if (kept) merged.push(kept);
          }
          return merged;
        };
        const techSelected = (getValues("technician_ids") ?? []).map(String);
        const salesSelected = [getValues("salesperson")?.trim() ?? ""].filter(Boolean);
        const managerSelected = [getValues("project_manager")?.trim() ?? ""].filter(Boolean);
        setTechnicianOptions((prev) =>
          mergeSelected(userProfilesToSelectOptions(byRole.technician ?? []), techSelected, prev),
        );
        setSalesOptions((prev) =>
          mergeSelected(userProfilesToSelectOptions(byRole.sales ?? []), salesSelected, prev),
        );
        setManagerOptions((prev) =>
          mergeSelected(userProfilesToSelectOptions(byRole.manager ?? []), managerSelected, prev),
        );
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
  }, [catalogEpoch, getValues]);

  const siteSourceKeyRef = React.useRef(`${customerId ?? ""}:${projectId ?? ""}:${isServiceQuotation}`);
  React.useEffect(() => {
    const key = `${customerId ?? ""}:${projectId ?? ""}:${isServiceQuotation}`;
    if (siteSourceKeyRef.current === key) return;
    siteSourceKeyRef.current = key;
    setSiteRows([]);
  }, [customerId, projectId, isServiceQuotation]);

  const mergeSiteRowsPreservingSelected = React.useCallback(
    (incoming: QuotationSiteOptionRow[]) => {
      setSiteRows((prev) => {
        const selected = new Set((getValues("sites") ?? []).map(String));
        const merged = [...incoming];
        for (const row of prev) {
          if (!selected.has(String(row.id))) continue;
          if (merged.some((r) => r.id === row.id)) continue;
          merged.push(row);
        }
        return merged;
      });
    },
    [getValues],
  );

  const ensureSiteInRows = React.useCallback(async (siteId: number) => {
    if (!Number.isFinite(siteId) || siteId <= 0) return;
    setSiteRows((prev) => {
      if (prev.some((row) => row.id === siteId)) return prev;
      return [...prev, { id: siteId, site_name: `Site #${siteId}` }];
    });
    try {
      const site = await fetchSite(siteId);
      const label = site.site_name?.trim() || `Site #${site.id}`;
      setSiteRows((prev) => {
        const idx = prev.findIndex((row) => row.id === site.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { id: site.id, site_name: label };
          return copy;
        }
        return [...prev, { id: site.id, site_name: label }];
      });
    } catch {
      // Keep placeholder row so the chip survives option pruning.
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const sitesSourceReady = isServiceQuotation
      ? customerId != null && customerId > 0
      : projectId != null && projectId > 0;
    if (!sitesSourceReady) {
      setSiteRows([]);
      return;
    }
    void (async () => {
      try {
        const rows = await fetchQuotationSiteRows({
          isServiceQuotation,
          clientId: customerId,
          projectId,
        });
        if (!cancelled) mergeSiteRowsPreservingSelected(rows);
      } catch {
        if (!cancelled) mergeSiteRowsPreservingSelected([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isServiceQuotation, customerId, projectId, catalogEpoch, mergeSiteRowsPreservingSelected]);

  const contactCustomerRef = React.useRef(customerId);
  React.useEffect(() => {
    if (contactCustomerRef.current === customerId) return;
    contactCustomerRef.current = customerId;
    setContactOptions([]);
  }, [customerId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!customerId || customerId <= 0) {
      setContactOptions([]);
      return;
    }
    (async () => {
      try {
        const { items } = await fetchContactsPage(1, 20, { client: customerId, dropdown: true });
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
  }, [customerId, catalogEpoch]);

  React.useEffect(() => {
    const selectedProject = getValues("project")?.trim();
    if (!selectedProject || !customerId) return;
    const stillExists = projectRows.some((p) => String(p.id) === selectedProject);
    if (!stillExists) {
      const savedCustomerId = existingDetail ? getQuotationCustomerId(existingDetail.customer) : null;
      const sameCustomer = savedCustomerId != null && customerId === savedCustomerId;
      if (isEdit && existingDetail && sameCustomer) {
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
    const rows = isEdit && existingDetail ? mergeQuotationSiteOptionRows(siteRows, existingDetail) : siteRows;
    return rows.map((s) => ({ value: String(s.id), label: s.site_name }));
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
            return null;
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
    // After draft/quick-create restore, do not auto-pick a single site over saved selections.
    if (formValuesRestoredRef.current) return;
    const sitesSourceReady = isServiceQuotation
      ? customerId != null && customerId > 0
      : projectId != null && projectId > 0;
    if (!sitesSourceReady) return;
    if ((sitesStr ?? []).length > 0) return;
    if (siteOptions.length !== 1) return;
    setValue("sites", [siteOptions[0].value], { shouldValidate: true, shouldDirty: true });
  }, [isServiceQuotation, customerId, projectId, sitesStr, siteOptions, setValue]);

  const projectOptions = React.useMemo<Option[]>(() => {
    const base = projectRows.map((p) => ({ value: String(p.id), label: p.name }));
    const pid = existingDetail ? getQuotationProjectId(existingDetail.project) : null;
    const nested =
      existingDetail?.project && typeof existingDetail.project === "object"
        ? existingDetail.project
        : null;
    const savedCustomerId = existingDetail ? getQuotationCustomerId(existingDetail.customer) : null;
    const sameCustomer = savedCustomerId != null && customerId === savedCustomerId;
    if (isEdit && sameCustomer && pid != null) {
      const exists = base.some((o) => o.value === String(pid));
      if (!exists) {
        const label = nested?.name?.trim() || `Project #${pid}`;
        return [{ value: String(pid), label }, ...base];
      }
    }
    return base;
  }, [projectRows, isEdit, existingDetail, customerId]);

  const primaryContactIdStr = useWatch({ control, name: "primary_customer_contact" });
  const salespersonIdStr = useWatch({ control, name: "salesperson" });
  const projectManagerIdStr = useWatch({ control, name: "project_manager" });

  const customerSelectFallbackLabel = React.useMemo(() => {
    if (!customerId) return undefined;
    const fromOptions = clientOptions.find((o) => o.value === String(customerId))?.label?.trim();
    if (fromOptions) return fromOptions;
    if (existingDetail && getQuotationCustomerId(existingDetail.customer) === customerId) {
      const label = quotationCustomerLabel(existingDetail.customer).trim();
      if (label && label !== "—") return label;
    }
    // Keep the selected chip visible after quick-create before options catch up.
    return `#${customerId}`;
  }, [customerId, clientOptions, existingDetail]);

  const projectSelectFallbackLabel = React.useMemo(() => {
    if (!projectId) return undefined;
    const fromOptions = projectOptions.find((o) => o.value === String(projectId))?.label?.trim();
    if (fromOptions) return fromOptions;
    if (existingDetail && getQuotationProjectId(existingDetail.project) === projectId) {
      const nested =
        existingDetail.project && typeof existingDetail.project === "object" ? existingDetail.project : null;
      const label = (nested?.name ?? "").trim();
      if (label) return label;
    }
    return `#${projectId}`;
  }, [projectId, projectOptions, existingDetail]);

  const primaryContactFallbackLabel = React.useMemo(() => {
    const id = primaryContactIdStr?.trim();
    if (!id || !/^\d+$/.test(id)) return undefined;
    const fromOptions = contactOptions.find((o) => o.value === id)?.label?.trim();
    if (fromOptions) return fromOptions;
    if (existingDetail && String(getQuotationContactId(existingDetail.primary_customer_contact) ?? "") === id) {
      const label = quotationContactLabel(existingDetail.primary_customer_contact).trim();
      if (label && label !== "—") return label;
    }
    return `#${id}`;
  }, [primaryContactIdStr, contactOptions, existingDetail]);

  const salespersonFallbackLabel = React.useMemo(() => {
    const id = salespersonIdStr?.trim();
    if (!id || !/^\d+$/.test(id)) return undefined;
    const fromOptions = salesOptions.find((o) => o.value === id)?.label?.trim();
    if (fromOptions) return fromOptions;
    if (existingDetail && String(getQuotationOptionalUserId(existingDetail.salesperson) ?? "") === id) {
      const label = quotationUserLabel(existingDetail.salesperson).trim();
      if (label && label !== "—") return label;
    }
    return `#${id}`;
  }, [salespersonIdStr, salesOptions, existingDetail]);

  const projectManagerFallbackLabel = React.useMemo(() => {
    const id = projectManagerIdStr?.trim();
    if (!id || !/^\d+$/.test(id)) return undefined;
    const fromOptions = managerOptions.find((o) => o.value === id)?.label?.trim();
    if (fromOptions) return fromOptions;
    if (existingDetail && String(getQuotationOptionalUserId(existingDetail.project_manager) ?? "") === id) {
      const label = quotationUserLabel(existingDetail.project_manager).trim();
      if (label && label !== "—") return label;
    }
    return `#${id}`;
  }, [projectManagerIdStr, managerOptions, existingDetail]);

  const sitesFallbackLabels = React.useMemo(() => {
    const labels: Record<string, string> = {};
    for (const raw of sitesStr ?? []) {
      const id = String(raw).trim();
      if (!id || !/^\d+$/.test(id)) continue;
      if (siteOptions.some((opt) => opt.value === id)) continue;
      labels[id] = `#${id}`;
    }
    return labels;
  }, [sitesStr, siteOptions]);

  const technicianIdsStr = useWatch({ control, name: "technician_ids" });
  const techniciansFallbackLabels = React.useMemo(() => {
    const labels: Record<string, string> = {};
    for (const raw of technicianIdsStr ?? []) {
      const id = String(raw).trim();
      if (!id || !/^\d+$/.test(id)) continue;
      if (technicianOptions.some((opt) => opt.value === id)) continue;
      labels[id] = `#${id}`;
    }
    return labels;
  }, [technicianIdsStr, technicianOptions]);

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
      initialDraft: restoredDraftRef.current ?? undefined,
    },
  );

  setQuoteDraftRef.current = setQuoteDraft;
  quoteDraftSnapshotRef.current = quoteDraft;
  formTabSnapshotRef.current = formTab;

  React.useEffect(() => {
    if (!quoteDraft || discardDraftsRef.current) return;
    writeQuotationWorkingDraft(workingDraftKey, quoteDraft);
  }, [quoteDraft, workingDraftKey]);

  const appliedRestoredDraftRef = React.useRef(false);
  React.useLayoutEffect(() => {
    if (appliedRestoredDraftRef.current) return;
    const restored = restoredDraftRef.current;
    if (!restored) return;
    appliedRestoredDraftRef.current = true;
    preventQuoteDraftSeedRef.current = true;
    writeQuotationWorkingDraft(workingDraftKey, restored);
    // Restore Details fields from the stable form snapshot (never overwrite with empty getValues()).
    const scopeReturnHref = buildQuotationScopeReturnHref(pathname);
    const existing =
      readQuotationFormValuesDraft<QuotationFormDraftBundle>(workingDraftKey) ??
      loadQuickCreateFormDraft<QuotationFormDraftBundle>(draftReturnTo) ??
      loadQuickCreateFormDraft<QuotationFormDraftBundle>(scopeReturnHref);
    if (existing && isQuotationFormDraftBundle(existing)) {
      formValuesRestoredRef.current = true;
      skipPresetFromUrlRef.current = true;
      reset(existing.values, { keepDefaultValues: false });
      const bundle = {
        values: existing.values,
        quoteDraft: restored,
        formTab: "pricing" as const,
      };
      writeQuotationFormValuesDraft(workingDraftKey, bundle);
      saveQuickCreateFormDraft(draftReturnTo, bundle);
      saveQuickCreateFormDraft(scopeReturnHref, bundle);
    }
    clearTakenQuotationSectionScopeDraft();
    setFormTab("pricing");
  }, [workingDraftKey, draftReturnTo, pathname, reset]);

  React.useEffect(() => {
    // Drop stale taken cache after apply so a later section round-trip can consume again.
    if (restoredDraftRef.current) clearTakenQuotationSectionScopeDraft();
  }, []);

  // After quick-create return (or Strict Mode remount), restore Details fields from the
  // working-form snapshot when the QC draft was already consumed.
  React.useLayoutEffect(() => {
    if (formValuesRestoredRef.current || isEdit) return;
    // Prefer QC draft restore when `?select=` is present (handled by useQuickCreateReturn).
    if (searchParams.get(QUICK_CREATE_SELECT_PARAM)) return;
    const fromWorking = readQuotationFormValuesDraft<QuotationFormDraftBundle>(workingDraftKey);
    if (!fromWorking || !isQuotationFormDraftBundle(fromWorking)) return;
    formValuesRestoredRef.current = true;
    skipPresetFromUrlRef.current = true;
    reset(fromWorking.values, { keepDefaultValues: false });
    if (fromWorking.formTab) setFormTab(fromWorking.formTab);
  }, [isEdit, workingDraftKey, reset, searchParams]);

  useQuickCreateReturn({
    draftReturnTo,
    restoreFormDraft,
    persistFormDraft,
    onReloadOptions: async () => {
      const values = getValues();
      const reloadCustomerId = parseFormIdField(values.customer);
      const reloadProjectId = parseFormIdField(values.project);
      invalidateUsersByRoleCache();
      const [{ items: clients }, byRole, tagsRes] = await Promise.all([
        fetchClientsPage(1, 20, { is_active: true, dropdown: true }),
        fetchUsersForAppRoles(["technician", "sales", "manager"]),
        fetchTagsPage(1, 20, { is_active: true, dropdown: true }),
      ]);
      setClientOptions((prev) => {
        const incoming = clientsToSelectOptions(clients);
        const selectedId = values.customer?.trim() ?? "";
        if (!selectedId) return incoming;
        if (incoming.some((opt) => opt.value === selectedId)) return incoming;
        const kept = prev.find((opt) => opt.value === selectedId);
        return kept ? [kept, ...incoming] : incoming;
      });
      setTechnicianOptions(userProfilesToSelectOptions(byRole.technician ?? []));
      setSalesOptions(userProfilesToSelectOptions(byRole.sales ?? []));
      setManagerOptions(userProfilesToSelectOptions(byRole.manager ?? []));
      const toLabel = (row: Tag) => row.name ?? row.tag_name ?? `#${row.id}`;
      setTagOptions(tagsRes.items.map((row) => ({ value: String(row.id), label: toLabel(row) })));
      if (reloadCustomerId) {
        const [projects, contacts] = await Promise.all([
          fetchProjectsPage(1, 20, { client: reloadCustomerId, dropdown: true }),
          fetchContactsPage(1, 20, { client: reloadCustomerId, dropdown: true }),
        ]);
        setProjectRows((prev) => {
          const selectedProjectId = values.project?.trim() ?? "";
          if (!selectedProjectId) return projects.items;
          if (projects.items.some((row) => String(row.id) === selectedProjectId)) return projects.items;
          const kept = prev.find((row) => String(row.id) === selectedProjectId);
          return kept ? [kept, ...projects.items] : projects.items;
        });
        setContactOptions((prev) => {
          const incoming = contacts.items.map((c) => ({
            value: String(c.id),
            label: formatContactOptionLabel(c),
          }));
          const selectedIds = new Set<string>();
          const primary = values.primary_customer_contact?.trim();
          if (primary) selectedIds.add(primary);
          for (const row of values.additional_customer_contacts ?? []) {
            const id = row.contact?.trim();
            if (id) selectedIds.add(id);
          }
          const merged = [...incoming];
          for (const opt of prev) {
            if (!selectedIds.has(opt.value)) continue;
            if (merged.some((row) => row.value === opt.value)) continue;
            merged.push(opt);
          }
          return merged;
        });
      }
      if (isServiceQuotation && reloadCustomerId) {
        const rows = await fetchQuotationSiteRows({
          isServiceQuotation: true,
          clientId: reloadCustomerId,
        });
        mergeSiteRowsPreservingSelected(rows);
      } else if (reloadProjectId) {
        const rows = await fetchQuotationSiteRows({
          isServiceQuotation: false,
          projectId: reloadProjectId,
        });
        mergeSiteRowsPreservingSelected(rows);
      }
    },
    onApplySelect: async ({ selectTarget, selectId }) => {
      if (selectTarget === "client") {
        const previousCustomer = getValues("customer")?.trim() ?? "";
        // Select immediately so the field is not left empty if option fetch is slow.
        setValue("customer", selectId, { shouldDirty: true, shouldValidate: true });
        if (previousCustomer && previousCustomer !== selectId) {
          setValue("project", "", { shouldDirty: true, shouldValidate: true });
          setValue("sites", [], { shouldDirty: true, shouldValidate: true });
          setValue("primary_customer_contact", "", { shouldDirty: true });
          setValue("additional_customer_contacts", [], { shouldDirty: true });
          setValue("site_contact", "", { shouldDirty: true });
        }
        const clientIdNum = Number.parseInt(selectId, 10);
        if (Number.isFinite(clientIdNum) && clientIdNum > 0) {
          await ensureClientInOptions(clientIdNum);
        }
        return;
      }
      if (selectTarget === "project") {
        const previousProject = getValues("project")?.trim() ?? "";
        setValue("project", selectId, { shouldDirty: true, shouldValidate: true });
        if (previousProject && previousProject !== selectId) {
          setValue("sites", [], { shouldDirty: true, shouldValidate: true });
          setValue("site_contact", "", { shouldDirty: true });
        }
        const projectIdNum = Number.parseInt(selectId, 10);
        if (Number.isFinite(projectIdNum) && projectIdNum > 0) {
          await ensureProjectInOptions(projectIdNum);
        }
        return;
      }
      if (selectTarget === "site") {
        const current = getValues("sites") ?? [];
        const next = current.includes(selectId) ? current : [...current, selectId];
        setValue("sites", next, { shouldDirty: true, shouldValidate: true });
        const siteId = Number.parseInt(selectId, 10);
        if (Number.isFinite(siteId) && siteId > 0) {
          await ensureSiteInRows(siteId);
        }
        return;
      }
      if (selectTarget === "contact") {
        const fieldTarget = peekQuickCreateFieldTarget(draftReturnTo) ?? "primary_customer_contact";
        const additionalMatch = /^additional_customer_contacts\.(\d+)$/.exec(fieldTarget);
        if (additionalMatch) {
          const rowIdx = Number.parseInt(additionalMatch[1] ?? "", 10);
          if (Number.isFinite(rowIdx) && rowIdx >= 0) {
            setValue(`additional_customer_contacts.${rowIdx}.contact`, selectId, {
              shouldDirty: true,
              shouldValidate: true,
            });
          } else {
            setValue("primary_customer_contact", selectId, { shouldDirty: true, shouldValidate: true });
          }
        } else {
          setValue("primary_customer_contact", selectId, { shouldDirty: true, shouldValidate: true });
        }
        const contactId = Number.parseInt(selectId, 10);
        if (Number.isFinite(contactId) && contactId > 0) {
          await ensureContactInOptions(contactId);
        }
        return;
      }
      if (selectTarget === "user") {
        const fieldTarget = peekQuickCreateFieldTarget(draftReturnTo) ?? "project_manager";
        const userId = Number.parseInt(selectId, 10);
        if (fieldTarget === "salesperson") {
          setValue("salesperson", selectId, { shouldDirty: true, shouldValidate: true });
          if (Number.isFinite(userId) && userId > 0) {
            const value = await ensureUserInRoleOptions(userId, "sales");
            if (value !== selectId) {
              setValue("salesperson", value, { shouldDirty: true, shouldValidate: true });
            }
          }
          return;
        }
        if (fieldTarget === "technician_ids") {
          const numericId = Number.parseInt(selectId, 10);
          if (Number.isFinite(numericId) && numericId > 0) {
            const current = getValues("technician_ids") ?? [];
            const next = current.includes(numericId) ? current : [...current, numericId];
            setValue("technician_ids", next, { shouldDirty: true, shouldValidate: true });
            await ensureUserInRoleOptions(userId, "technician");
          }
          return;
        }
        setValue("project_manager", selectId, { shouldDirty: true, shouldValidate: true });
        if (Number.isFinite(userId) && userId > 0) {
          const value = await ensureUserInRoleOptions(userId, "manager");
          if (value !== selectId) {
            setValue("project_manager", value, { shouldDirty: true, shouldValidate: true });
          }
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

  function focusFirstInvalidOnDetailsTab() {
    window.setTimeout(() => {
      const root = document.getElementById("quotation-form-screen-project");
      const invalid =
        root?.querySelector<HTMLElement>("[aria-invalid='true']") ??
        root?.querySelector<HTMLElement>(".border-red-500");
      invalid?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (invalid && typeof invalid.focus === "function") {
        try {
          invalid.focus({ preventScroll: true });
        } catch {
          invalid.focus();
        }
      }
    }, 80);
  }

  function onInvalid(formErrors: FieldErrors<QuotationFormValues>) {
    const detailKeys = ["quote_name", "customer", "sites", "project"] as const;
    const hasDetailErrors = detailKeys.some((key) => formErrors[key] != null);
    if (hasDetailErrors) {
      setFormTab("project");
      const tabLabel = t(isServiceQuotation ? "formTabs.details" : "formTabs.project");
      toastError(t("validation.requiredOnTab", { tab: tabLabel }));
      focusFirstInvalidOnDetailsTab();
      return;
    }
    toastError(t("saveError"));
  }

  async function onSubmit(values: QuotationFormValues) {
    if (!isServiceQuotation && parseOptionalId(values.project) == null) {
      setError("project", { type: "manual", message: t("validation.project") });
      setFormTab("project");
      toastError(
        t("validation.requiredOnTab", {
          tab: t(isServiceQuotation ? "formTabs.details" : "formTabs.project"),
        }),
      );
      focusFirstInvalidOnDetailsTab();
      return;
    }
    setSaving(true);
    try {
      const basePayload = mapQuotationFormToPayload(values, {
        quote_category: isServiceQuotation ? QUOTE_CATEGORY.service : QUOTE_CATEGORY.project,
      });
      let merged = quoteDraft
        ? mergeQuotationDraftIntoPayload(basePayload, quoteDraft, {
            defaultSectionType: isServiceQuotation ? "primary" : "project",
          })
        : basePayload;
      if (isEdit && !quoteDraft && existingDetail?.quote_sections && existingDetail.quote_sections.length > 0) {
        const computedGrand = sumQuoteSectionsGrandTotal(existingDetail.quote_sections);
        merged = {
          ...merged,
          quote_sections: existingDetail.quote_sections,
          grand_total: Number.isFinite(computedGrand) ? computedGrand : null,
        };
      }
      const payload = merged;
      const saved = isEdit && quotationId ? await updateQuotation(quotationId, payload) : await createQuotation(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      discardDraftsRef.current = true;
      clearQuotationWorkingDraft(workingDraftKey);
      if (!isEdit) {
        clearQuickCreateFormDraft(draftReturnTo);
        clearQuickCreateFormDraft(buildQuotationScopeReturnHref(pathname));
      }
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
        title={
          isEdit
            ? (existingDetail?.quote_name ?? t("page.editTitle"))
            : isServiceQuotation
              ? t("page.createServiceTitle")
              : t("page.createProjectTitle")
        }
        titleLoading={isEdit && loadingExisting && !existingDetail}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={
          isEdit && existingDetail
            ? t("page.lastUpdated", {
                date: dateFmt.format(new Date(existingDetail.modified_at ?? existingDetail.created_at)),
              })
            : isServiceQuotation
              ? t("page.createServiceSubtitle")
              : t("page.createProjectSubtitle")
        }
        actions={
          <div className="flex items-center gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => {
                discardDraftsRef.current = true;
                clearQuotationWorkingDraft(workingDraftKey);
                if (!isEdit) {
                  clearQuickCreateFormDraft(draftReturnTo);
                  clearQuickCreateFormDraft(buildQuotationScopeReturnHref(pathname));
                }
                router.push(safeBack ?? routes.dashboard.quotations);
              }}
            >
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
          <form id="quotation-form-screen" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(onSubmit, onInvalid)}>
            {/* {noProjects ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                {t("noClientsHint")}
              </p>
            ) : null} */}
            <CustomizableAppTabs
              tabs={[
                { id: "project", label: t(isServiceQuotation ? "formTabs.details" : "formTabs.project") },
                { id: "pricing", label: t("formTabs.pricing") },
              ]}
              value={formTab}
              onValueChange={(id) => {
                persistFormDraft();
                setFormTab(id === "pricing" ? "pricing" : "project");
              }}
              storageKey={tabsStorageKey}
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
              map={
                <AddressMultiMiniMap
                  points={selectedSiteMapPoints}
                  className={detailMapFillClassName}
                  mapClassName="h-full min-h-0 flex-1"
                />
              }
            >
            <div className="space-y-6">
            <FormFieldRow cols="2" from="xl">
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
                      fallbackLabel={customerSelectFallbackLabel}
                      emptyLabel={t("placeholders.customer")}
                      disabled={saving || (noClients && !field.value)}
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
                      fallbackLabel={projectSelectFallbackLabel}
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
                      disabled={saving || (isServiceQuotation ? !customerId : !projectId)}
                      placeholder={t("placeholders.site")}
                      listLabel={t("fields.sites")}
                      fallbackLabels={sitesFallbackLabels}
                      onAdd={siteQuickCreate.onAdd}
                      addAriaLabel={siteQuickCreate.addAriaLabel}
                      addLabel={siteQuickCreate.addLabel}
                    />
                  )}
                />
                <FieldErrorText>{errors.sites?.message}</FieldErrorText>
              </FieldGroup>
              {isEdit ? (
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
              ) : null}
            </FormFieldRow>
            <FormFieldRow cols="2" from="xl">
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
                      fallbackLabel={primaryContactFallbackLabel}
                      emptyLabel={t("placeholders.contactOptional")}
                      disabled={saving || !customerId}
                      onBlur={field.onBlur}
                      onAdd={contactQuickCreate.canAdd ? addPrimaryContact : undefined}
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
                storeQuickCreateFieldTarget(
                  draftReturnTo,
                  `additional_customer_contacts.${rowIndex}`,
                );
              }}
            />
            {isEdit ? (
              <FormFieldRow cols="2" from="xl">
                <FieldGroup label={t("fields.orderNumber")} htmlFor="quotation-order">
                  <input id="quotation-order" className={surfaceInputClassName} {...register("order_number")} />
                </FieldGroup>
              </FormFieldRow>
            ) : null}
            <FormFieldRow cols="2" from="xl">
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
                      fallbackLabel={salespersonFallbackLabel}
                      emptyLabel={t("placeholders.userOptional")}
                      disabled={saving}
                      onBlur={field.onBlur}
                      onAdd={salespersonQuickCreate.onAdd}
                      addAriaLabel={salespersonQuickCreate.addAriaLabel}
                      addLabel={salespersonQuickCreate.addLabel}
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
                      fallbackLabel={projectManagerFallbackLabel}
                      emptyLabel={t("placeholders.userOptional")}
                      disabled={saving}
                      onBlur={field.onBlur}
                      onAdd={projectManagerQuickCreate.onAdd}
                      addAriaLabel={projectManagerQuickCreate.addAriaLabel}
                      addLabel={projectManagerQuickCreate.addLabel}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FieldGroup>
            </FormFieldRow>
            <FormFieldRow cols="2" from="xl">
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
                      fallbackLabels={techniciansFallbackLabels}
                      onAdd={technicianQuickCreate.onAdd}
                      addAriaLabel={technicianQuickCreate.addAriaLabel}
                      addLabel={technicianQuickCreate.addLabel}
                    />
                  )}
                />
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
            <DetailTabStepNav
              onNext={() => {
                persistFormDraft();
                setFormTab("pricing");
              }}
              nextLabel={t("formTabs.nextToPricing")}
            />
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
                  sectionKindTabs={isServiceQuotation}
                  initialScopeKindTab={(() => {
                    const restored = restoredDraftRef.current;
                    const sid = readQuotationSectionScopeSession()?.sectionId;
                    const sec = restored?.sections.find((s) => s.id === sid);
                    return sec && isOptionalQuoteSection(sec) ? "optional" : "primary";
                  })()}
                  onBeforeLeavePage={persistFormDraft}
                />
              </div>
              <DetailTabStepNav
                onPrev={() => {
                  persistFormDraft();
                  setFormTab("project");
                }}
                prevLabel={t(isServiceQuotation ? "formTabs.prevToDetails" : "formTabs.prevToProject")}
              />
            </div>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
