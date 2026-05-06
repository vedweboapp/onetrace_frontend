"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { createGroup, updateGroup } from "@/features/groups/api/group.api";
import type { Group, GroupCompositeItemRef } from "@/features/groups/types/group.types";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { toastSuccess } from "@/shared/feedback/app-toast";
import {
  AppButton,
  AppModal,
  FieldLabel,
  fieldErrorTextClassName,
  surfaceInputClassName,
  surfaceSelectClassName,
} from "@/shared/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  group: Group | null;
  onSaved: () => void;
};

type CompositeRow = { id: string; composite_item: string; abbreviation: string };

function nextRowId(): string {
  return `group-comp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumberOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function GroupFormModal({ open, onClose, mode, group, onSaved }: Props) {
  const t = useTranslations("Dashboard.groups.modal");

  const nameId = React.useId();
  const [name, setName] = React.useState("");
  const [rows, setRows] = React.useState<CompositeRow[]>([{ id: nextRowId(), composite_item: "", abbreviation: "" }]);
  const [compositeOptions, setCompositeOptions] = React.useState<CompositeItem[]>([]);
  const [compositeLoadError, setCompositeLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [nameTouched, setNameTouched] = React.useState(false);

  const nameInvalid = nameTouched && name.trim().length === 0;

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
        group.composite_items && group.composite_items.length > 0
          ? group.composite_items.map((entry) => ({
              id: nextRowId(),
              composite_item: String(entry.composite_item),
              abbreviation: entry.abbreviation ?? "",
            }))
          : [{ id: nextRowId(), composite_item: "", abbreviation: "" }];
      setRows(nextRows);
    } else {
      setName("");
      setRows([{ id: nextRowId(), composite_item: "", abbreviation: "" }]);
    }
    setNameTouched(false);
  }, [open, mode, group]);

  function normalizeRows(next: CompositeRow[]): CompositeRow[] {
    return next.length > 0 ? next : [{ id: nextRowId(), composite_item: "", abbreviation: "" }];
  }

  function buildCompositeItemsPayload(): GroupCompositeItemRef[] | null {
    const out: GroupCompositeItemRef[] = [];
    const seen = new Set<number>();
    for (const row of rows) {
      const id = toNumberOrNull(row.composite_item);
      const abbreviation = row.abbreviation.trim();
      const emptyRow = id == null && abbreviation.length === 0;
      if (emptyRow) continue;
      if (id == null || abbreviation.length === 0) return null;
      if (seen.has(id)) return null;
      seen.add(id);
      out.push({ composite_item: id, abbreviation });
    }
    return out;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    if (!name.trim()) return;
    const compositeItems = buildCompositeItemsPayload();
    if (compositeItems == null) return;

    setSubmitting(true);
    try {
      if (mode === "edit" && group) {
        await updateGroup(group.id, { name: name.trim(), composite_items: compositeItems });
        toastSuccess(t("updatedToast"));
      } else {
        await createGroup({ name: name.trim(), composite_items: compositeItems });
        toastSuccess(t("createdToast"));
      }
      onSaved();
      onClose();
    } catch {
      
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
      size="md"
      showCloseButton
      closeOnBackdrop={!submitting}
      isBusy={submitting}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="md" disabled={submitting} onClick={handleCloseAttempt}>
            {t("cancel")}
          </AppButton>
          <AppButton type="submit" form="group-form" variant="primary" size="md" loading={submitting}>
            {mode === "edit" ? t("saveChanges") : t("save")}
          </AppButton>
        </>
      }
    >
      <form id="group-form" className="space-y-5" onSubmit={(e) => void submit(e)}>
        <div>
          <FieldLabel htmlFor={nameId} required>
            {t("name")}
          </FieldLabel>
          <input
            id={nameId}
            type="text"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            disabled={submitting}
            placeholder={t("namePlaceholder")}
            className={surfaceInputClassName}
          />
          {nameInvalid ? <p className={fieldErrorTextClassName}>{t("nameError")}</p> : null}
        </div>

        <div>
          <FieldLabel>{t("compositeItems")}</FieldLabel>
          {compositeLoadError ? (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{compositeLoadError}</p>
          ) : null}
          <div className="mt-2 space-y-2">
            {rows.map((row, idx) => (
              <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("compositeItem")}
                  </span>
                  <select
                    value={row.composite_item}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, composite_item: value } : x)));
                    }}
                    disabled={submitting}
                    className={surfaceSelectClassName}
                  >
                    <option value="">{t("compositeItemPlaceholder")}</option>
                    {compositeOptions.map((opt) => (
                      <option key={opt.id} value={String(opt.id)}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("abbreviation")}
                  </span>
                  <input
                    type="text"
                    autoComplete="off"
                    value={row.abbreviation}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, abbreviation: value } : x)));
                    }}
                    disabled={submitting}
                    placeholder={t("abbreviationPlaceholder")}
                    className={surfaceInputClassName}
                  />
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={submitting || rows.length <= 1}
                    onClick={() => setRows((prev) => normalizeRows(prev.filter((x) => x.id !== row.id)))}
                  >
                    {t("removeCompositeItem")}
                  </AppButton>
                  {idx === rows.length - 1 ? (
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={submitting}
                      onClick={() => setRows((prev) => [...prev, { id: nextRowId(), composite_item: "", abbreviation: "" }])}
                    >
                      {t("addCompositeItem")}
                    </AppButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("compositeItemsHint")}</p>
        </div>
      </form>
    </AppModal>
  );
}
