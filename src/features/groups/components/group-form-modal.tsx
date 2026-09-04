"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createGroup, updateGroup } from "@/features/groups/api/group.api";
import type { Group } from "@/features/groups/types/group.types";
import {
  validateGroupCompositeRows,
  normalizeGroupAbbreviation,
  GROUP_ABBREVIATION_MAX_LENGTH,
  type GroupCompositeRowError,
} from "@/features/groups/utils/group-composite-rows.util";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import { usePathname } from "@/i18n/navigation";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { cn } from "@/core/utils/http.util";
import { checkmarkOptionsExcludingUsed } from "@/shared/utils/checkmark-options-excluding.util";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  type CheckmarkSelectOption,
  FieldGroup,
  FieldErrorText,
  FormFieldRow,
  RequiredMark,
  fieldErrorTextClassName,
  surfaceInputClassName,
} from "@/shared/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  group: Group | null;
  onSaved: () => void;
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
    // Start-align so Remove sits next to Abbreviation; column width follows the
    // widest row (Remove + Add row) and justify-end would leave a large gap.
    "flex flex-wrap items-center gap-2 px-3 py-2",
    rowIndex > 0 && "sm:border-t sm:border-slate-100 dark:sm:border-slate-800",
  );
}

export function GroupFormModal({ open, onClose, mode, group, onSaved }: Props) {
  const t = useTranslations("Dashboard.groups.modal");
  const router = useRouter();
  const pathname = usePathname();
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

  const nameInvalid = nameTouched && name.trim().length === 0;
  const hasAtLeastOneItem = rows.some((r) => r.item.trim().length > 0);
  const itemsInvalid = itemsTouched && !hasAtLeastOneItem;
  const compositeSelectOptions = React.useMemo<CheckmarkSelectOption[]>(
    () => compositeOptions.map((opt) => ({ value: String(opt.id), label: opt.name })),
    [compositeOptions],
  );

  const compositeQuickCreate = useQuickCreate({
    kind: "composite-item",
    returnTo: pathname,
    getFormDraft: open && mode === "create" ? () => ({ name, rows }) : undefined,
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
    if (!open) return;
    (async () => {
      setCompositeLoadError(null);
      try {
        const { items } = await fetchCompositeItemsPage(1, 500);
        if (!cancelled) setCompositeOptions(items);
      } catch {
        if (!cancelled) setCompositeLoadError(t("compositeLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && group) {
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
    } else {
      setName("");
      setRows([{ id: nextRowId(), item: "", abbreviation: "" }]);
    }
    setNameTouched(false);
    setItemsTouched(false);
    setRowErrors({});
  }, [open, mode, group]);

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
      compositeItemRequired: t("compositeItemRequired"),
      abbreviationRequired: t("abbreviationRequired"),
      abbreviationMaxLength: t("abbreviationMaxLength"),
      duplicateCompositeItem: t("duplicateCompositeItemError"),
    });
    setRowErrors(errors);
    if (compositeItems == null) return;

    setSubmitting(true);
    try {
      const saved =
        mode === "edit" && group
          ? await updateGroup(group.id, { name: name.trim(), items: compositeItems })
          : await createGroup({ name: name.trim(), items: compositeItems });
      toastSuccess(mode === "edit" ? t("updatedToast") : t("createdToast"));
      onSaved();
      onClose();
      router.push(buildEntityDetailHrefAfterSave(routes.dashboard.groups, saved.id, routes.dashboard.groups));
    } catch (error) {
      toastApiError(error);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseAttempt() {
    if (!submitting) onClose();
  }

  return (
    <AppModal
      open={open}
      onClose={handleCloseAttempt}
      title={mode === "edit" ? t("editTitle") : t("createTitle")}
      size="xl"
      showCloseButton
      closeOnBackdrop={!submitting}
      isBusy={submitting}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={submitting} onClick={handleCloseAttempt}>
            {t("cancel")}
          </AppButton>
          <AppButton type="submit" form="group-form" variant="primary" size="sm" loading={submitting}>
            {mode === "edit" ? t("saveChanges") : t("save")}
          </AppButton>
        </>
      }
    >
      <form id="group-form" className="space-y-5" onSubmit={(e) => void submit(e)}>
        <FormFieldRow cols="2" from="md" labelTop>
          <FieldGroup label={t("name")} htmlFor={nameId} required>
            <input
              id={nameId}
              type="text"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(sanitizeTitleInput(e.target.value))}
              onBlur={() => setNameTouched(true)}
              disabled={submitting}
              placeholder={t("namePlaceholder")}
              className={surfaceInputClassName}
            />
            {nameInvalid ? <FieldErrorText>{t("nameError")}</FieldErrorText> : null}
          </FieldGroup>
        </FormFieldRow>

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
                {t("compositeItem")}
                <RequiredMark alwaysVisible />
              </span>
              <span className={compositeHeaderCellClassName}>
                {t("abbreviation")}
                <RequiredMark alwaysVisible />
              </span>
              <span className={compositeHeaderCellClassName} aria-hidden />
              {rows.map((row, idx) => {
                const errors = rowErrors[row.id];
                return (
                <React.Fragment key={row.id}>
                  <div className={compositeItemCellClassName(idx)}>
                    <CheckmarkSelect
                      listLabel={t("compositeItem")}
                      buttonAriaLabel={t("compositeItem")}
                      value={row.item}
                      onChange={(value) => {
                        clearRowError(row.id, "item");
                        setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, item: value } : x)));
                      }}
                      options={compositeOptionsForRow(row.id)}
                      emptyLabel={t("compositeItemPlaceholder")}
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
                      placeholder={t("abbreviationPlaceholder")}
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
                      {t("removeCompositeItem")}
                    </AppButton>
                    {idx === rows.length - 1 ? (
                      <AppButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={submitting}
                        onClick={() => setRows((prev) => [...prev, { id: nextRowId(), item: "", abbreviation: "" }])}
                      >
                        {t("addCompositeItem")}
                      </AppButton>
                    ) : null}
                  </div>
                </React.Fragment>
                );
              })}
            </div>
          </div>
          {itemsInvalid ? <p className={fieldErrorTextClassName}>{t("atLeastOneCompositeItemError")}</p> : null}
        </div>
      </form>
    </AppModal>
  );
}
