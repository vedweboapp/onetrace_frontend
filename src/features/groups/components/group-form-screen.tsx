"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { createGroup, fetchGroup, updateGroup } from "@/features/groups/api/group.api";
import {
  validateGroupCompositeRows,
  normalizeGroupAbbreviation,
  GROUP_ABBREVIATION_MAX_LENGTH,
  type GroupCompositeRowError,
} from "@/features/groups/utils/group-composite-rows.util";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { clearQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import {
  resolveFormBackUrl,
} from "@/shared/utils/quick-create-navigation.util";
import { checkmarkOptionsExcludingUsed } from "@/shared/utils/checkmark-options-excluding.util";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { cn } from "@/core/utils/http.util";
import {
  AppButton,
  CheckmarkSelect,
  type CheckmarkSelectOption,
  FieldLabel,
  fieldErrorTextClassName,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  groupId?: number;
};

type CompositeRow = { id: string; item: string; abbreviation: string };

function nextRowId(): string {
  return `group-comp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const COMPOSITE_ITEMS_GRID =
  "grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:gap-x-3";

const compositeHeaderCellClassName =
  "hidden border-b border-slate-100 bg-slate-50/95 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 sm:block";

function compositeItemCellClassName(rowIndex: number) {
  return cn(
    "min-w-0 px-3 py-2",
    rowIndex > 0 && "border-t border-slate-100 dark:border-slate-800",
  );
}

function compositeAbbreviationCellClassName(rowIndex: number) {
  return cn("px-3 py-2", rowIndex > 0 && "sm:border-t sm:border-slate-100 dark:sm:border-slate-800");
}

function compositeActionsCellClassName(rowIndex: number) {
  return cn(
    "flex gap-2 px-3 py-2 sm:justify-end",
    rowIndex > 0 && "sm:border-t sm:border-slate-100 dark:sm:border-slate-800",
  );
}

export function GroupFormScreen({ mode, groupId }: Props) {
  const t = useTranslations("Dashboard.groups");
  const tModal = useTranslations("Dashboard.groups.modal");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = useFormBackUrl("groups", routes.dashboard.groups);
  const isEdit = mode === "edit";
  const pendingCompositeRowRef = React.useRef<string | null>(null);

  const nameId = React.useId();
  const [name, setName] = React.useState("");
  const [rows, setRows] = React.useState<CompositeRow[]>([{ id: nextRowId(), item: "", abbreviation: "" }]);
  const [compositeOptions, setCompositeOptions] = React.useState<CompositeItem[]>([]);
  const [compositeLoadError, setCompositeLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [nameTouched, setNameTouched] = React.useState(false);
  const [itemsTouched, setItemsTouched] = React.useState(false);
  const [rowErrors, setRowErrors] = React.useState<Record<string, GroupCompositeRowError>>({});
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);

  const nameInvalid = nameTouched && name.trim().length === 0;
  const hasAtLeastOneItem = rows.some((r) => r.item.trim().length > 0);
  const itemsInvalid = itemsTouched && !hasAtLeastOneItem;
  const compositeSelectOptions = React.useMemo<CheckmarkSelectOption[]>(
    () => compositeOptions.map((opt) => ({ value: String(opt.id), label: opt.name })),
    [compositeOptions],
  );

  const draftReturnTo = React.useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const getFormDraft = React.useCallback(() => ({ name, rows }), [name, rows]);

  const restoreFormDraft = React.useCallback((draft: unknown) => {
    const saved = draft as { name?: string; rows?: CompositeRow[] };
    if (typeof saved.name === "string") setName(saved.name);
    if (Array.isArray(saved.rows) && saved.rows.length > 0) setRows(saved.rows);
  }, []);

  const reloadComposites = React.useCallback(async () => {
    setCompositeLoadError(null);
    try {
      const { items } = await fetchCompositeItemsPage(1, 500);
      setCompositeOptions(items);
    } catch {
      setCompositeLoadError(tModal("compositeLoadError"));
    }
  }, [tModal]);

  const compositeQuickCreate = useQuickCreate({
    kind: "composite-item",
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });

  useQuickCreateReturn({
    restoreFormDraft: !isEdit ? restoreFormDraft : undefined,
    onReloadOptions: reloadComposites,
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget !== "composite-item") return;
      const rowId = pendingCompositeRowRef.current;
      if (rowId) {
        setRows((prev) => prev.map((x) => (x.id === rowId ? { ...x, item: selectId } : x)));
      } else {
        setRows((prev) => {
          const emptyIdx = prev.findIndex((r) => !r.item.trim());
          if (emptyIdx >= 0) {
            return prev.map((x, i) => (i === emptyIdx ? { ...x, item: selectId } : x));
          }
          return [...prev, { id: nextRowId(), item: selectId, abbreviation: "" }];
        });
      }
      pendingCompositeRowRef.current = null;
    },
  });

  const compositeOptionsForRow = React.useCallback(
    (rowId: string) =>
      checkmarkOptionsExcludingUsed(
        compositeSelectOptions,
        rows.filter((r) => r.id !== rowId).map((r) => r.item),
        rows.find((r) => r.id === rowId)?.item ?? "",
      ),
    [compositeSelectOptions, rows],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setCompositeLoadError(null);
      try {
        const { items } = await fetchCompositeItemsPage(1, 500);
        if (!cancelled) setCompositeOptions(items);
      } catch {
        if (!cancelled) setCompositeLoadError(tModal("compositeLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tModal]);

  React.useEffect(() => {
    if (!isEdit || !groupId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const group = await fetchGroup(groupId);
        if (!cancelled) {
          setName(group.name ?? "");
          const nextRows =
            group.items && group.items.length > 0
              ? group.items.map((entry) => ({
                  id: nextRowId(),
                  item: String(entry.item),
                  abbreviation: entry.abbreviation ?? "",
                }))
              : [{ id: nextRowId(), item: "", abbreviation: "" }];
          setRows(nextRows);
          setNameTouched(false);
          setItemsTouched(false);
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
  }, [groupId, isEdit, t]);

  function normalizeRows(next: CompositeRow[]): CompositeRow[] {
    return next.length > 0 ? next : [{ id: nextRowId(), item: "", abbreviation: "" }];
  }

  function clearRowError(rowId: string, field: keyof GroupCompositeRowError) {
    setRowErrors((prev) => {
      const current = prev[rowId];
      if (!current?.[field]) return prev;
      const next = { ...current, [field]: undefined };
      if (!next.item && !next.abbreviation) {
        const { [rowId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [rowId]: next };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    setItemsTouched(true);
    if (!name.trim()) return;
    if (!hasAtLeastOneItem) {
      setRowErrors({});
      return;
    }

    const { items: compositeItems, errors } = validateGroupCompositeRows(rows, {
      compositeItemRequired: tModal("compositeItemRequired"),
      abbreviationRequired: tModal("abbreviationRequired"),
      abbreviationMaxLength: tModal("abbreviationMaxLength"),
      duplicateCompositeItem: tModal("duplicateCompositeItemError"),
    });
    setRowErrors(errors);
    if (compositeItems == null) return;

    setSubmitting(true);
    try {
      const saved =
        isEdit && groupId
          ? await updateGroup(groupId, { name: name.trim(), items: compositeItems })
          : await createGroup({ name: name.trim(), items: compositeItems });
      toastSuccess(isEdit ? tModal("updatedToast") : tModal("createdToast"));
      if (!isEdit) clearQuickCreateFormDraft(draftReturnTo);
      router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.groups, saved.id, safeBack));
    } catch (error) {
      toastApiError(error, t("loadError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={submitting} onClick={() => router.push(safeBack ?? routes.dashboard.groups)}>
              {tModal("cancel")}
            </AppButton>
            <AppButton type="submit" form="group-form-screen" variant="primary" size="sm" loading={submitting}>
              {isEdit ? tModal("saveChanges") : tModal("save")}
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
          <form id="group-form-screen" className="space-y-5 p-4 sm:p-6" onSubmit={(e) => void submit(e)}>
            <div>
              <FieldLabel htmlFor={nameId} required>
                {tModal("name")}
              </FieldLabel>
              <input
                id={nameId}
                type="text"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(sanitizeTitleInput(e.target.value))}
                onBlur={() => setNameTouched(true)}
                disabled={submitting}
                placeholder={tModal("namePlaceholder")}
                className={surfaceInputClassName}
              />
              {nameInvalid ? <p className={fieldErrorTextClassName}>{tModal("nameError")}</p> : null}
            </div>
            <div>
              {compositeLoadError ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">{compositeLoadError}</p>
              ) : null}
              <div
                className={cn(
                  "overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950",
                  compositeLoadError ? "mt-2" : undefined,
                )}
              >
                <div className={COMPOSITE_ITEMS_GRID}>
                  <span className={compositeHeaderCellClassName}>
                    {tModal("compositeItem")}
                    <span className="ml-1 text-red-500">*</span>
                  </span>
                  <span className={compositeHeaderCellClassName}>
                    {tModal("abbreviation")}
                    <span className="ml-1 text-red-500">*</span>
                  </span>
                  <span className={compositeHeaderCellClassName} aria-hidden />
                  {rows.map((row, idx) => {
                    const errors = rowErrors[row.id];
                    return (
                    <React.Fragment key={row.id}>
                      <div className={compositeItemCellClassName(idx)}>
                        <CheckmarkSelect
                          listLabel={tModal("compositeItem")}
                          buttonAriaLabel={tModal("compositeItem")}
                          value={row.item}
                          onChange={(value) => {
                            clearRowError(row.id, "item");
                            setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, item: value } : x)));
                          }}
                          options={compositeOptionsForRow(row.id)}
                          emptyLabel={tModal("compositeItemPlaceholder")}
                          disabled={submitting}
                          invalid={Boolean(errors?.item)}
                          portaled
                          searchable
                          className="w-full"
                          onAdd={
                            compositeQuickCreate.onAdd
                              ? () => {
                                  pendingCompositeRowRef.current = row.id;
                                  compositeQuickCreate.onAdd?.();
                                }
                              : undefined
                          }
                          addAriaLabel={compositeQuickCreate.addAriaLabel}
                          addLabel={compositeQuickCreate.addLabel}
                        />
                        {errors?.item ? <p className={fieldErrorTextClassName}>{errors.item}</p> : null}
                      </div>
                      <div className={compositeAbbreviationCellClassName(idx)}>
                        <input
                          type="text"
                          autoComplete="off"
                          value={row.abbreviation}
                          maxLength={GROUP_ABBREVIATION_MAX_LENGTH}
                          onChange={(e) => {
                            const value = normalizeGroupAbbreviation(e.target.value);
                            clearRowError(row.id, "abbreviation");
                            setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, abbreviation: value } : x)));
                          }}
                          disabled={submitting}
                          placeholder={tModal("abbreviationPlaceholder")}
                          className={cn(
                            surfaceInputClassName,
                            "w-full",
                            errors?.abbreviation && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                          )}
                        />
                        {errors?.abbreviation ? (
                          <p className={fieldErrorTextClassName}>{errors.abbreviation}</p>
                        ) : null}
                      </div>
                      <div className={compositeActionsCellClassName(idx)}>
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={submitting || rows.length <= 1}
                          onClick={() => {
                            setRowErrors((prev) => {
                              const { [row.id]: _, ...rest } = prev;
                              return rest;
                            });
                            setRows((prev) => normalizeRows(prev.filter((x) => x.id !== row.id)));
                          }}
                        >
                          {tModal("removeCompositeItem")}
                        </AppButton>
                        {idx === rows.length - 1 ? (
                          <AppButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={submitting}
                            onClick={() => setRows((prev) => [...prev, { id: nextRowId(), item: "", abbreviation: "" }])}
                          >
                            {tModal("addCompositeItem")}
                          </AppButton>
                        ) : null}
                      </div>
                    </React.Fragment>
                    );
                  })}
                </div>
              </div>
              {itemsInvalid ? <p className={fieldErrorTextClassName}>{tModal("atLeastOneCompositeItemError")}</p> : null}
            </div>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
