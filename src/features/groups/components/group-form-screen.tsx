"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { createGroup, fetchGroup, updateGroup } from "@/features/groups/api/group.api";
import type { GroupItemRef } from "@/features/groups/types/group.types";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
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

function toNumberOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function GroupFormScreen({ mode, groupId }: Props) {
  const t = useTranslations("Dashboard.groups");
  const tModal = useTranslations("Dashboard.groups.modal");
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "groups");
  const isEdit = mode === "edit";

  const nameId = React.useId();
  const [name, setName] = React.useState("");
  const [rows, setRows] = React.useState<CompositeRow[]>([{ id: nextRowId(), item: "", abbreviation: "" }]);
  const [compositeOptions, setCompositeOptions] = React.useState<CompositeItem[]>([]);
  const [compositeLoadError, setCompositeLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [nameTouched, setNameTouched] = React.useState(false);
  const [itemsTouched, setItemsTouched] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);

  const nameInvalid = nameTouched && name.trim().length === 0;
  const hasAtLeastOneItem = rows.some((r) => r.item.trim().length > 0);
  const itemsInvalid = itemsTouched && !hasAtLeastOneItem;
  const compositeSelectOptions = React.useMemo<CheckmarkSelectOption[]>(
    () => compositeOptions.map((opt) => ({ value: String(opt.id), label: opt.name })),
    [compositeOptions],
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

  function buildCompositeItemsPayload(): GroupItemRef[] | null {
    const out: GroupItemRef[] = [];
    const seen = new Set<number>();
    for (const row of rows) {
      const id = toNumberOrNull(row.item);
      const abbreviation = row.abbreviation.trim();
      const emptyRow = id == null && abbreviation.length === 0;
      if (emptyRow) continue;
      if (id == null || abbreviation.length === 0) return null;
      if (seen.has(id)) return null;
      seen.add(id);
      out.push({ item: id, abbreviation });
    }
    return out;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    setItemsTouched(true);
    if (!name.trim()) return;
    if (!hasAtLeastOneItem) return;
    const compositeItems = buildCompositeItemsPayload();
    if (compositeItems == null) return;

    setSubmitting(true);
    try {
      const saved =
        isEdit && groupId
          ? await updateGroup(groupId, { name: name.trim(), items: compositeItems })
          : await createGroup({ name: name.trim(), items: compositeItems });
      toastSuccess(isEdit ? tModal("updatedToast") : tModal("createdToast"));
      router.replace(`${safeBack}?highlight=${saved.id}`);
    } catch {
      toastError(t("loadError"));
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
            <AppButton type="button" variant="secondary" size="md" disabled={submitting} onClick={() => router.push(safeBack)}>
              {tModal("cancel")}
            </AppButton>
            <AppButton type="submit" form="group-form-screen" variant="primary" size="md" loading={submitting}>
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
                onChange={(e) => setName(capitalizeFirstLetter(e.target.value))}
                onBlur={() => setNameTouched(true)}
                disabled={submitting}
                placeholder={tModal("namePlaceholder")}
                className={surfaceInputClassName}
              />
              {nameInvalid ? <p className={fieldErrorTextClassName}>{tModal("nameError")}</p> : null}
            </div>
            <div>
              <FieldLabel>{tModal("compositeItems")}</FieldLabel>
              {compositeLoadError ? (
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{compositeLoadError}</p>
              ) : null}
              <div className="mt-2 space-y-2">
                {rows.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                    <div>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        {tModal("compositeItem")}
                        <span className="ml-1 text-red-500">*</span>
                      </span>
                      <CheckmarkSelect
                        listLabel={tModal("compositeItem")}
                        buttonAriaLabel={tModal("compositeItem")}
                        value={row.item}
                        onChange={(value) => {
                          setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, item: value } : x)));
                        }}
                        options={compositeSelectOptions}
                        emptyLabel={tModal("compositeItemPlaceholder")}
                        disabled={submitting}
                        portaled
                        className="w-full"
                      />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        {tModal("abbreviation")}
                      </span>
                      <input
                        type="text"
                        autoComplete="off"
                        value={row.abbreviation}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, abbreviation: value } : x)));
                        }}
                        disabled={submitting}
                        placeholder={tModal("abbreviationPlaceholder")}
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
                  </div>
                ))}
              </div>
              {itemsInvalid ? <p className={fieldErrorTextClassName}>{tModal("atLeastOneCompositeItemError")}</p> : null}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tModal("compositeItemsHint")}</p>
            </div>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
