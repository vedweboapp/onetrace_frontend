"use client";

import * as React from "react";
import { ChevronDown, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { fetchGroup, fetchGroupsPage } from "@/features/groups/api/group.api";
import type { Group, GroupItemRef } from "@/features/groups/types/group.types";
import type { QuotationDraft, QuotationDraftLine, QuotationDraftPlot } from "@/features/quotations/types/quotation-draft.types";
import { newQuotationDraftId } from "@/features/quotations/utils/quotation-draft-id.util";
import {
  draftGrandTotal,
  draftPinTotal,
  draftPlotTotal,
  draftSectionTotal,
} from "@/features/quotations/utils/quotation-draft-compute.util";
import { reorderArray } from "@/features/quotations/utils/quotation-draft-ops.util";
import { formatMoneyDisplay, parseMoneyValue } from "@/features/quotations/utils/quotation-level-pricing.util";
import { cn } from "@/core/utils/http.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { AppButton, AppModal, CheckmarkSelect, DataTableRowActionsMenu, surfaceInputClassName } from "@/shared/ui";

type DndPayload =
  | { scope: "section"; fromIndex: number }
  | { scope: "plot"; sectionIndex: number; fromIndex: number }
  | { scope: "line"; sectionIndex: number; plotIndex: number; fromIndex: number }
  | { scope: "section-line"; sectionIndex: number; fromIndex: number };

const DND_TYPE = "application/x-quotation-draft";
const inlineEditClassName =
  "appearance-none border-0 bg-transparent px-0 py-0 text-inherit shadow-none ring-0 outline-none focus:border-0 focus:ring-0 focus:outline-none";

function syncTextareaToContent(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
}

type DraftAutosizeTitleTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "rows"
> & {
  value: string;
  onValueChange: (next: string) => void;
};

/** Single-line min height; grows with content — no max-height scrollbar. */
function DraftAutosizeTitleTextarea({
  value,
  onValueChange,
  className,
  onPointerDown,
  ...rest
}: DraftAutosizeTitleTextareaProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const sync = React.useCallback(() => {
    syncTextareaToContent(ref.current);
  }, []);

  React.useLayoutEffect(() => {
    sync();
  }, [value, sync]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      className={cn(
        inlineEditClassName,
        "min-w-0 flex-1 cursor-text resize-none overflow-hidden py-1 leading-snug",
        className,
      )}
      onChange={(e) => onValueChange(e.target.value)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.(e);
      }}
      {...rest}
    />
  );
}

function parseDnd(raw: string): DndPayload | null {
  try {
    const v = JSON.parse(raw) as DndPayload;
    if (!v || typeof v !== "object") return null;
    return v;
  } catch {
    return null;
  }
}

function draftSummaryKeyToggle(
  e: React.KeyboardEvent<HTMLElement>,
  isOpen: boolean,
  setOpen: (next: boolean) => void,
) {
  if (e.key !== "Enter" && e.key !== " ") return;
  const t = e.target as HTMLElement;
  if (t.closest("textarea, input") || t.closest("[data-draft-row-actions]")) return;
  e.preventDefault();
  setOpen(!isOpen);
}

type CompositeLineLabels = {
  qty: string;
  unitPrice: string;
  duplicateLine: string;
  removeLine: string;
  rowActions: string;
};

type CompositeDraftLinesDrag = {
  onDragLineStart: (li: number, ev: React.DragEvent) => void;
  onDragLineOver: (e: React.DragEvent) => void;
  onDropLine: (e: React.DragEvent, li: number) => void;
};

function CompositeDraftLinesBody({
  pins,
  saving,
  locale,
  emptyHint,
  hideWhenEmpty,
  labels,
  onDuplicateLine,
  onRemoveLine,
  onPatchLine,
  drag,
  readOnly = false,
}: {
  pins: QuotationDraftLine[];
  saving: boolean;
  locale: string;
  /** Shown when there are no pins and hideWhenEmpty is false. */
  emptyHint?: string;
  /** When true, render nothing if there are no pins (no empty placeholder). */
  hideWhenEmpty?: boolean;
  labels: CompositeLineLabels;
  onDuplicateLine: (li: number) => void;
  onRemoveLine: (li: number) => void;
  onPatchLine: (li: number, patch: Partial<QuotationDraftLine>) => void;
  drag?: CompositeDraftLinesDrag;
  readOnly?: boolean;
}) {
  const draggable = Boolean(drag) && !saving && !readOnly;

  if (pins.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-3 py-3 dark:border-slate-600 dark:bg-slate-950/40">
        {emptyHint ? <p className="text-xs text-slate-500 dark:text-slate-400">{emptyHint}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-2 dark:border-slate-600 dark:bg-slate-950/45">
      <ul className="space-y-1.5">
        {pins.map((line, li) => (
          <li
            key={line.id}
            draggable={draggable}
            onDragStart={
              drag && !readOnly
                ? (e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("input, textarea, button, [role='menu'], [role='menuitem']")) {
                      e.preventDefault();
                      return;
                    }
                    drag.onDragLineStart(li, e);
                  }
                : undefined
            }
            onDragOver={!readOnly ? drag?.onDragLineOver : undefined}
            onDrop={drag && !readOnly ? (e) => drag.onDropLine(e, li) : undefined}
            className={cn(
              "flex flex-col gap-3 rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2 sm:py-2",
              draggable && "cursor-grab active:cursor-grabbing",
            )}
          >
            <div className="min-w-0 w-full flex-1 basis-full sm:pr-1">
              <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">{line.name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 sm:shrink-0">
              <label className="inline-flex shrink-0 items-center gap-2.5">
                <span className="w-8 shrink-0 text-right text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {labels.qty}
                </span>
                {readOnly ? (
                  <span className="inline-block min-w-[2.5rem] text-right text-xs font-medium tabular-nums text-slate-800 dark:text-slate-200 sm:min-w-[3rem]">
                    {line.quantity}
                  </span>
                ) : (
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={line.quantity}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      onPatchLine(li, { quantity: Number.isFinite(n) && n > 0 ? n : 1 });
                    }}
                    disabled={saving}
                    className={cn(inlineEditClassName, "w-12 cursor-text text-right text-xs tabular-nums sm:w-14")}
                  />
                )}
              </label>
              <label className="inline-flex shrink-0 items-center gap-2.5">
                <span className="min-w-[4.75rem] shrink-0 text-right text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:min-w-[5.25rem]">
                  {labels.unitPrice}
                </span>
                {readOnly ? (
                  <span className="inline-block min-w-[4.5rem] text-right text-xs font-medium tabular-nums text-slate-800 dark:text-slate-200 sm:min-w-[5rem]">
                    {formatMoneyDisplay(line.selling_price, locale)}
                  </span>
                ) : (
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={Number.isFinite(line.selling_price) ? line.selling_price : 0}
                    onChange={(e) => {
                      const n = Number.parseFloat(e.target.value);
                      onPatchLine(li, { selling_price: Number.isFinite(n) && n >= 0 ? n : 0 });
                    }}
                    disabled={saving}
                    className={cn(inlineEditClassName, "w-[4.75rem] cursor-text text-right text-xs tabular-nums sm:w-[5.25rem]")}
                  />
                )}
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 sm:ml-auto sm:w-auto sm:shrink-0">
              <span className="min-w-[5.5rem] shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100 sm:min-w-[6rem]">
                {formatMoneyDisplay(draftPinTotal(line), locale)}
              </span>
              {!readOnly ? (
                <DataTableRowActionsMenu
                  className="shrink-0"
                  menuAriaLabel={labels.rowActions}
                  items={[
                    {
                      id: "dup-line",
                      label: labels.duplicateLine,
                      icon: Copy,
                      onSelect: () => onDuplicateLine(li),
                    },
                    {
                      id: "del-line",
                      label: labels.removeLine,
                      icon: Trash2,
                      tone: "danger",
                      onSelect: () => onRemoveLine(li),
                    },
                  ]}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Props = {
  draft: QuotationDraft | null;
  onDraftChange: React.Dispatch<React.SetStateAction<QuotationDraft | null>>;
  saving: boolean;
  canShow: boolean;
  /** When true, scope is view-only (detail page): no edits, adds, deletes, or drag-reorder. */
  readOnly?: boolean;
};

export function QuotationDraftComposer({ draft, onDraftChange, saving, canShow, readOnly = false }: Props) {
  const t = useTranslations("Dashboard.quotations.draft");
  const tDraw = useTranslations("Dashboard.projects.drawings.editor");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";

  const [newSectionName, setNewSectionName] = React.useState("");
  const [addTarget, setAddTarget] = React.useState<{ si: number; pi: number | null } | null>(null);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [compositeRows, setCompositeRows] = React.useState<CompositeItem[]>([]);
  const [pickValue, setPickValue] = React.useState("");
  const [selectedGroupId, setSelectedGroupId] = React.useState("");
  const [selectedGroupItems, setSelectedGroupItems] = React.useState<GroupItemRef[] | null>(null);
  const [openSectionIds, setOpenSectionIds] = React.useState<Set<string>>(() => new Set());
  const [openPlotIds, setOpenPlotIds] = React.useState<Set<string>>(() => new Set());
  const [sectionTitleEditId, setSectionTitleEditId] = React.useState<string | null>(null);

  const groupOptions = React.useMemo(
    () => [{ value: "", label: tDraw("allGroups") }, ...groups.map((g) => ({ value: String(g.id), label: g.name }))],
    [groups, tDraw],
  );

  const compositeOptions = React.useMemo(() => {
    if (!selectedGroupId) {
      return [{ value: "", label: tDraw("selectComposite") }, ...compositeRows.map((ci) => ({ value: String(ci.id), label: ci.name }))];
    }
    const itemNameById: Record<number, string> = {};
    for (const ci of compositeRows) itemNameById[ci.id] = ci.name;
    const uniqueByItem = new Map<number, { value: string; label: string }>();
    for (const entry of selectedGroupItems ?? []) {
      if (uniqueByItem.has(entry.item)) continue;
      uniqueByItem.set(entry.item, {
        value: String(entry.item),
        label: entry.item_name ?? itemNameById[entry.item] ?? `#${entry.item}`,
      });
    }
    const groupScoped = Array.from(uniqueByItem.values());
    return [{ value: "", label: tDraw("selectComposite") }, ...groupScoped];
  }, [selectedGroupId, compositeRows, selectedGroupItems, tDraw]);

  React.useEffect(() => {
    if (!addTarget) return;
    let cancelled = false;
    (async () => {
      try {
        const [gRes, cRes] = await Promise.all([fetchGroupsPage(1, 500), fetchCompositeItemsPage(1, 500)]);
        if (!cancelled) {
          setGroups(gRes.items);
          setCompositeRows(cRes.items);
        }
      } catch {
        if (!cancelled) {
          setGroups([]);
          setCompositeRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addTarget]);

  function resetCompositePickerFields() {
    setPickValue("");
    setSelectedGroupId("");
    setSelectedGroupItems(null);
  }

  function closeCompositePickerModal() {
    setAddTarget(null);
    resetCompositePickerFields();
  }

  React.useEffect(() => {
    if (!addTarget || !selectedGroupId) return;
    let cancelled = false;
    (async () => {
      try {
        const g = await fetchGroup(Number.parseInt(selectedGroupId, 10));
        if (!cancelled) setSelectedGroupItems(g.items ?? []);
      } catch {
        if (!cancelled) setSelectedGroupItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addTarget, selectedGroupId]);

  function patchDraft(cb: (d: QuotationDraft) => QuotationDraft) {
    if (readOnly) return;
    onDraftChange((prev) => (prev ? cb(prev) : prev));
  }

  React.useEffect(() => {
    if (!readOnly || !draft?.sections.length) return;
    setOpenSectionIds(new Set(draft.sections.map((s) => s.id)));
    setOpenPlotIds(new Set(draft.sections.flatMap((s) => s.plots.map((p) => p.id))));
    setSectionTitleEditId(null);
  }, [readOnly, draft]);

  function addSection() {
    const trimmed = newSectionName.trim();
    if (!trimmed) return;
    const name = capitalizeFirstLetter(trimmed);
    patchDraft((d) => ({
      sections: [
        ...d.sections,
        {
          id: newQuotationDraftId("sec"),
          level_id: null,
          name,
          included: true,
          section_pins: [],
          plots: [],
        },
      ],
    }));
    setNewSectionName("");
  }

  function duplicateSection(si: number) {
    patchDraft((d) => {
      const source = d.sections[si];
      if (!source) return d;
      const cloned = {
        ...source,
        id: newQuotationDraftId("sec"),
        name: `${source.name} (Copy)`,
        section_pins: (source.section_pins ?? []).map((ln) => ({ ...ln, id: newQuotationDraftId("line") })),
        plots: source.plots.map((p) => ({
          ...p,
          id: newQuotationDraftId("plot"),
          pins: p.pins.map((ln) => ({ ...ln, id: newQuotationDraftId("line") })),
        })),
      };
      const sections = [...d.sections];
      sections.splice(si + 1, 0, cloned);
      return { sections };
    });
  }

  function deleteSection(si: number) {
    patchDraft((d) => ({ sections: d.sections.filter((_, i) => i !== si) }));
  }

  function duplicatePlot(si: number, pi: number) {
    patchDraft((d) => {
      const sec = d.sections[si];
      const plot = sec?.plots[pi];
      if (!sec || !plot) return d;
      const clone: QuotationDraftPlot = {
        ...plot,
        id: newQuotationDraftId("plot"),
        name: `${plot.name} (Copy)`,
        pins: plot.pins.map((ln) => ({ ...ln, id: newQuotationDraftId("line") })),
      };
      const plots = [...sec.plots];
      plots.splice(pi + 1, 0, clone);
      return { sections: d.sections.map((s, i) => (i === si ? { ...s, plots } : s)) };
    });
  }

  function removePlot(si: number, pi: number) {
    patchDraft((d) => {
      const sections = d.sections.map((s, i) => (i === si ? { ...s, plots: s.plots.filter((_, j) => j !== pi) } : s));
      return { sections };
    });
  }

  function duplicateLine(si: number, pi: number, li: number) {
    patchDraft((d) => {
      const line = d.sections[si]?.plots[pi]?.pins[li];
      if (!line) return d;
      const clone = { ...line, id: newQuotationDraftId("line") };
      const plotPins = [...d.sections[si].plots[pi].pins];
      plotPins.splice(li + 1, 0, clone);
      return {
        sections: d.sections.map((s, i) =>
          i === si
            ? {
                ...s,
                plots: s.plots.map((p, j) => (j === pi ? { ...p, pins: plotPins } : p)),
              }
            : s,
        ),
      };
    });
  }

  function removeLine(si: number, pi: number, li: number) {
    patchDraft((d) => ({
      sections: d.sections.map((s, i) =>
        i === si
          ? {
              ...s,
              plots: s.plots.map((p, j) =>
                j === pi ? { ...p, pins: p.pins.filter((_, k) => k !== li) } : p,
              ),
            }
          : s,
      ),
    }));
  }

  function duplicateSectionLine(si: number, li: number) {
    patchDraft((d) => {
      const sec = d.sections[si];
      if (!sec) return d;
      const prevPins = sec.section_pins ?? [];
      const line = prevPins[li];
      if (!line) return d;
      const clone = { ...line, id: newQuotationDraftId("line") };
      const section_pins = [...prevPins];
      section_pins.splice(li + 1, 0, clone);
      return {
        sections: d.sections.map((s, i) => (i === si ? { ...s, section_pins } : s)),
      };
    });
  }

  function removeSectionLine(si: number, li: number) {
    patchDraft((d) => ({
      sections: d.sections.map((s, i) =>
        i === si ? { ...s, section_pins: (s.section_pins ?? []).filter((_, k) => k !== li) } : s,
      ),
    }));
  }

  function updateSectionLine(si: number, li: number, patch: Partial<QuotationDraftLine>) {
    patchDraft((d) => ({
      sections: d.sections.map((s, i) =>
        i === si
          ? {
              ...s,
              section_pins: (s.section_pins ?? []).map((ln, k) => (k === li ? { ...ln, ...patch } : ln)),
            }
          : s,
      ),
    }));
  }

  function updateLine(si: number, pi: number, li: number, patch: Partial<QuotationDraftLine>) {
    patchDraft((d) => ({
      sections: d.sections.map((s, i) =>
        i === si
          ? {
              ...s,
              plots: s.plots.map((p, j) =>
                j === pi
                  ? {
                      ...p,
                      pins: p.pins.map((ln, k) => (k === li ? { ...ln, ...patch } : ln)),
                    }
                  : p,
              ),
            }
          : s,
      ),
    }));
  }

  function updatePlotName(si: number, pi: number, name: string) {
    patchDraft((d) => ({
      sections: d.sections.map((s, i) => (i === si ? { ...s, plots: s.plots.map((p, j) => (j === pi ? { ...p, name } : p)) } : s)),
    }));
  }

  function updateSectionName(si: number, name: string) {
    patchDraft((d) => ({
      sections: d.sections.map((s, i) => (i === si ? { ...s, name } : s)),
    }));
  }

  function toggleIncluded(si: number, included: boolean) {
    patchDraft((d) => ({
      sections: d.sections.map((s, i) => (i === si ? { ...s, included } : s)),
    }));
  }

  function toggleAllSections(included: boolean) {
    patchDraft((d) => ({
      sections: d.sections.map((s) => ({ ...s, included })),
    }));
  }

  function toggleSectionOpen(sectionId: string, open: boolean) {
    setOpenSectionIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(sectionId);
      else next.delete(sectionId);
      return next;
    });
    if (!open) {
      setSectionTitleEditId((id) => (id === sectionId ? null : id));
    }
  }

  function togglePlotOpen(plotId: string, open: boolean) {
    setOpenPlotIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(plotId);
      else next.delete(plotId);
      return next;
    });
  }

  function onDropSection(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    const parsed = parseDnd(e.dataTransfer.getData(DND_TYPE));
    if (!parsed || parsed.scope !== "section") return;
    patchDraft((d) => {
      const sections = reorderArray(d.sections, parsed.fromIndex, toIndex);
      return { sections };
    });
  }

  function onDropPlot(e: React.DragEvent, sectionIndex: number, toIndex: number) {
    e.preventDefault();
    const parsed = parseDnd(e.dataTransfer.getData(DND_TYPE));
    if (!parsed || parsed.scope !== "plot" || parsed.sectionIndex !== sectionIndex) return;
    patchDraft((d) => ({
      sections: d.sections.map((s, i) =>
        i === sectionIndex ? { ...s, plots: reorderArray(s.plots, parsed.fromIndex, toIndex) } : s,
      ),
    }));
  }

  function onDropLine(e: React.DragEvent, sectionIndex: number, plotIndex: number, toIndex: number) {
    e.preventDefault();
    const parsed = parseDnd(e.dataTransfer.getData(DND_TYPE));
    if (!parsed || parsed.scope !== "line") return;
    if (parsed.sectionIndex !== sectionIndex || parsed.plotIndex !== plotIndex) return;
    patchDraft((d) => ({
      sections: d.sections.map((s, si) =>
        si === sectionIndex
          ? {
              ...s,
              plots: s.plots.map((p, pi) =>
                pi === plotIndex ? { ...p, pins: reorderArray(p.pins, parsed.fromIndex, toIndex) } : p,
              ),
            }
          : s,
      ),
    }));
  }

  function onDropSectionLine(e: React.DragEvent, sectionIndex: number, toIndex: number) {
    e.preventDefault();
    const parsed = parseDnd(e.dataTransfer.getData(DND_TYPE));
    if (!parsed || parsed.scope !== "section-line") return;
    if (parsed.sectionIndex !== sectionIndex) return;
    patchDraft((d) => ({
      sections: d.sections.map((s, si) =>
        si === sectionIndex
          ? { ...s, section_pins: reorderArray(s.section_pins ?? [], parsed.fromIndex, toIndex) }
          : s,
      ),
    }));
  }

  function openPickCompositeModal(si: number, pi: number | null) {
    if (readOnly) return;
    resetCompositePickerFields();
    setAddTarget({ si, pi });
  }

  function confirmPickComposite() {
    if (!addTarget || !pickValue) return;
    const id = Number.parseInt(pickValue, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    const picked = compositeRows.find((r) => r.id === id);
    const label = picked?.name ?? compositeOptions.find((o) => o.value === pickValue)?.label ?? `Item ${id}`;
    const unit = picked ? parseMoneyValue(picked.selling_price ?? picked.cost_price) : 0;
    const newLine: QuotationDraftLine = {
      id: newQuotationDraftId("line"),
      pin_id: null,
      composite_item_id: id,
      name: label,
      quantity: 1,
      selling_price: unit,
    };
    if (addTarget.pi === null) {
      patchDraft((d) => ({
        sections: d.sections.map((s, si) =>
          si === addTarget.si ? { ...s, section_pins: [...(s.section_pins ?? []), newLine] } : s,
        ),
      }));
    } else {
      const pi = addTarget.pi;
      patchDraft((d) => ({
        sections: d.sections.map((s, si) =>
          si === addTarget.si
            ? {
                ...s,
                plots: s.plots.map((p, j) =>
                  j === pi ? { ...p, pins: [...p.pins, newLine] } : p,
                ),
              }
            : s,
        ),
      }));
    }
    closeCompositePickerModal();
  }

  function onSectionSummaryClick(e: React.MouseEvent<HTMLElement>, sectionId: string, isOpen: boolean) {
    const t = e.target as HTMLElement;
    if (t.closest("textarea, input") || t.closest("[data-draft-row-actions]")) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    toggleSectionOpen(sectionId, !isOpen);
  }

  function onPlotSummaryClick(e: React.MouseEvent<HTMLElement>, plotId: string, isOpen: boolean) {
    const t = e.target as HTMLElement;
    if (t.closest("textarea, input") || t.closest("[data-draft-row-actions]")) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    togglePlotOpen(plotId, !isOpen);
  }

  if (!canShow) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("selectProjectHint")}</p>;
  }

  if (!draft) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("loadingDraft")}</p>;
  }

  const grand = draftGrandTotal(draft);
  const allIncluded = draft.sections.length > 0 && draft.sections.every((s) => s.included);

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={allIncluded}
              disabled={saving || draft.sections.length === 0}
              onChange={(e) => toggleAllSections(e.target.checked)}
            />
            <span>{t("selectAllSections")}</span>
          </label>

          <div className="flex max-w-xl flex-row flex-wrap items-center gap-1.5">
            <label className="sr-only" htmlFor="draft-new-section">
              {t("newSectionLabel")}
            </label>
            <input
              id="draft-new-section"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onBlur={() =>
                setNewSectionName((prev) => {
                  const next = capitalizeFirstLetter(prev);
                  return next !== prev ? next : prev;
                })
              }
              placeholder={t("newSectionPlaceholder")}
              className={cn(surfaceInputClassName, "min-w-0 flex-1")}
              disabled={saving}
            />
            <AppButton type="button" variant="secondary" size="md" disabled={saving || newSectionName.trim().length === 0} onClick={addSection}>
              {t("addSection")}
            </AppButton>
          </div>
        </>
      ) : null}

      {draft.sections.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("emptySections")}</p>
      ) : (
        <ul className="space-y-3">
          {draft.sections.map((section, si) => (
            <li
              key={section.id}
              className={cn(
                "rounded-xl border-2 p-3 shadow-sm transition-colors sm:p-4",
                section.included
                  ? "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                  : "border-slate-200 bg-slate-50/90 opacity-90 dark:border-slate-700",
              )}
              onDragOver={
                readOnly
                  ? undefined
                  : (e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }
              }
              onDrop={readOnly ? undefined : (e) => onDropSection(e, si)}
            >
              <details open={openSectionIds.has(section.id)}>
                <summary
                  aria-expanded={openSectionIds.has(section.id)}
                  className="list-none cursor-pointer select-none"
                  onClick={(e) => onSectionSummaryClick(e, section.id, openSectionIds.has(section.id))}
                  onKeyDown={(e) =>
                    draftSummaryKeyToggle(e, openSectionIds.has(section.id), (next) =>
                      toggleSectionOpen(section.id, next),
                    )
                  }
                >
                  <div
                    className="flex flex-wrap items-center gap-x-2 gap-y-2"
                    draggable={!saving && !readOnly}
                    onDragStart={
                      readOnly
                        ? undefined
                        : (e) => {
                            const el = e.target as HTMLElement;
                            if (el.closest("textarea, input")) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData(DND_TYPE, JSON.stringify({ scope: "section", fromIndex: si } satisfies DndPayload));
                          }
                    }
                  >
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        className="-m-1 inline-flex shrink-0 rounded p-1 text-slate-400"
                        aria-label={t("toggleRowExpand")}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSectionOpen(section.id, !openSectionIds.has(section.id));
                        }}
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 transition-transform duration-200",
                            openSectionIds.has(section.id) && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 rounded border-slate-300"
                        checked={section.included}
                        disabled={saving || readOnly}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => toggleIncluded(si, e.target.checked)}
                        aria-label={t("includeSection")}
                      />
                    </div>
                    {readOnly ? (
                      <>
                        <div className="min-h-[2.25rem] min-w-0 flex-1 px-0.5 py-1 text-left text-base font-semibold leading-snug break-words text-slate-900 dark:text-slate-100">
                          {section.name?.trim() || t("newSectionPlaceholder")}
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                            {formatMoneyDisplay(draftSectionTotal(section), loc)}
                          </span>
                        </div>
                      </>
                    ) : openSectionIds.has(section.id) && sectionTitleEditId === section.id ? (
                      <DraftAutosizeTitleTextarea
                        value={section.name}
                        onValueChange={(v) => updateSectionName(si, v)}
                        onBlur={() => {
                          setSectionTitleEditId(null);
                          const raw = section.name;
                          const next = capitalizeFirstLetter(raw);
                          if (next !== raw) updateSectionName(si, next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
                        }}
                        disabled={saving}
                        aria-label={t("newSectionPlaceholder")}
                        className="min-h-[2.25rem] font-semibold"
                        autoFocus
                      />
                    ) : (
                      <div className="group/draftSecTitle flex min-w-0 flex-1 items-start justify-start gap-1.5">
                        <button
                          type="button"
                          disabled={saving}
                          className={cn(
                            inlineEditClassName,
                            "min-h-[2.25rem] w-fit min-w-0 max-w-full cursor-pointer rounded-md px-0.5 py-1 text-left font-semibold leading-snug break-words",
                            "text-slate-900 dark:text-slate-100",
                          )}
                          aria-label={t("toggleRowExpand")}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSectionOpen(section.id, !openSectionIds.has(section.id));
                          }}
                        >
                          {section.name?.trim() || t("newSectionPlaceholder")}
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          className={cn(
                            "-m-0.5 mt-0.5 shrink-0 rounded p-1 text-slate-400 transition-opacity duration-150",
                            "opacity-0 group-hover/draftSecTitle:opacity-100 hover:text-slate-600 dark:hover:text-slate-300",
                            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/80 dark:focus-visible:ring-slate-500/80",
                          )}
                          aria-label={t("editRowName")}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSectionOpen(section.id, true);
                            setSectionTitleEditId(section.id);
                          }}
                        >
                          <Pencil className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        </button>
                      </div>
                    )}
                    {!readOnly ? (
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          className={cn(
                            inlineEditClassName,
                            "cursor-pointer text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100",
                          )}
                          aria-label={t("toggleRowExpand")}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSectionOpen(section.id, !openSectionIds.has(section.id));
                          }}
                        >
                          {formatMoneyDisplay(draftSectionTotal(section), loc)}
                        </button>
                        <div data-draft-row-actions className="shrink-0">
                          <DataTableRowActionsMenu
                            menuAriaLabel={t("rowActions")}
                            items={[
                              {
                                id: "dup-sec",
                                label: t("duplicateSection"),
                                icon: Copy,
                                onSelect: () => duplicateSection(si),
                              },
                              {
                                id: "del-sec",
                                label: t("deleteSection"),
                                icon: Trash2,
                                tone: "danger",
                                onSelect: () => deleteSection(si),
                              },
                            ]}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {section.level_id == null ? (
                    <p className="mt-1 pl-8 text-xs text-slate-500 dark:text-slate-400">{t("quoteOnlySection")}</p>
                  ) : null}
                </summary>

                <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50/40 p-3 dark:border-slate-700 dark:bg-slate-950/25">
                  {!readOnly ? (
                    <div className="flex flex-wrap items-center justify-start gap-2">
                      <AppButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="shrink-0 gap-1.5"
                        disabled={saving}
                        onClick={() => openPickCompositeModal(si, null)}
                      >
                        <Plus className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        {t("addComposite")}
                      </AppButton>
                    </div>
                  ) : null}
                  <CompositeDraftLinesBody
                    hideWhenEmpty
                    pins={section.section_pins ?? []}
                    saving={saving}
                    locale={loc}
                    labels={{
                      qty: t("qty"),
                      unitPrice: t("unitPrice"),
                      duplicateLine: t("duplicateLine"),
                      removeLine: t("removeLine"),
                      rowActions: t("rowActions"),
                    }}
                    onDuplicateLine={(li) => duplicateSectionLine(si, li)}
                    onRemoveLine={(li) => removeSectionLine(si, li)}
                    onPatchLine={(li, patch) => updateSectionLine(si, li, patch)}
                    readOnly={readOnly}
                    drag={
                      readOnly
                        ? undefined
                        : {
                            onDragLineStart: (li, ev) => {
                              ev.dataTransfer.effectAllowed = "move";
                              ev.dataTransfer.setData(
                                DND_TYPE,
                                JSON.stringify({
                                  scope: "section-line",
                                  sectionIndex: si,
                                  fromIndex: li,
                                } satisfies DndPayload),
                              );
                            },
                            onDragLineOver: (e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            },
                            onDropLine: (e, li) => onDropSectionLine(e, si, li),
                          }
                    }
                  />

                  {(section.section_pins ?? []).length === 0 && section.plots.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("emptyPlots")}</p>
                  ) : section.plots.length > 0 ? (
                    <ul className="space-y-2">
                      {section.plots.map((plot, pi) => (
                        <PlotBlock
                          key={plot.id}
                          plot={plot}
                          saving={saving}
                          locale={loc}
                          isOpen={openPlotIds.has(plot.id)}
                          onToggleOpen={(open) => togglePlotOpen(plot.id, open)}
                          onPlotName={(name) => updatePlotName(si, pi, name)}
                          onOpenAddComposite={() => openPickCompositeModal(si, pi)}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData(
                              DND_TYPE,
                              JSON.stringify({ scope: "plot", sectionIndex: si, fromIndex: pi } satisfies DndPayload),
                            );
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => onDropPlot(e, si, pi)}
                          onDuplicatePlot={() => duplicatePlot(si, pi)}
                          onRemovePlot={() => removePlot(si, pi)}
                          onDuplicateLine={(li) => duplicateLine(si, pi, li)}
                          onRemoveLine={(li) => removeLine(si, pi, li)}
                          onDragLineStart={(li, ev) => {
                            ev.dataTransfer.effectAllowed = "move";
                            ev.dataTransfer.setData(
                              DND_TYPE,
                              JSON.stringify({
                                scope: "line",
                                sectionIndex: si,
                                plotIndex: pi,
                                fromIndex: li,
                              } satisfies DndPayload),
                            );
                          }}
                          onDragLineOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDropLine={(e, li) => onDropLine(e, si, pi, li)}
                          onPatchLine={(li, patch) => updateLine(si, pi, li, patch)}
                          onSummaryClick={(e) => onPlotSummaryClick(e, plot.id, openPlotIds.has(plot.id))}
                          readOnly={readOnly}
                        />
                      ))}
                    </ul>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-50">
        <span>
          {t("grandTotal")}: <span className="tabular-nums">{formatMoneyDisplay(grand, loc)}</span>
        </span>
      </div>

      <AppModal
        open={!readOnly && addTarget !== null}
        onClose={closeCompositePickerModal}
        title={t("pickCompositeTitle")}
        size="md"
        footer={
          <>
            <AppButton type="button" variant="secondary" size="md" onClick={closeCompositePickerModal}>
              {t("cancel")}
            </AppButton>
            <AppButton type="button" variant="primary" size="md" disabled={!pickValue} onClick={confirmPickComposite}>
              {t("addComposite")}
            </AppButton>
          </>
        }
      >
        {addTarget ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <CheckmarkSelect
              id="draft-pick-group"
              portaled
              listLabel={`${tDraw("chooseGroup")} *`}
              options={groupOptions}
              value={selectedGroupId}
              emptyLabel={tDraw("allGroups")}
              disabled={saving}
              onChange={(v) => {
                setSelectedGroupId(v);
                setPickValue("");
                setSelectedGroupItems(null);
              }}
            />
            <CheckmarkSelect
              id="draft-pick-composite"
              portaled
              listLabel={`${tDraw("chooseComposite")} *`}
              options={compositeOptions}
              value={pickValue}
              emptyLabel={tDraw("selectComposite")}
              disabled={compositeOptions.length <= 1}
              onChange={setPickValue}
            />
          </div>
        ) : null}
        {addTarget && compositeRows.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("noComposites")}</p>
        ) : null}
      </AppModal>
    </div>
  );
}

type PlotBlockProps = {
  plot: QuotationDraftPlot;
  saving: boolean;
  locale: string;
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  onPlotName: (name: string) => void;
  onOpenAddComposite: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDuplicatePlot: () => void;
  onRemovePlot: () => void;
  onDuplicateLine: (li: number) => void;
  onRemoveLine: (li: number) => void;
  onDragLineStart: (li: number, ev: React.DragEvent) => void;
  onDragLineOver: (e: React.DragEvent) => void;
  onDropLine: (e: React.DragEvent, toIndex: number) => void;
  onPatchLine: (li: number, patch: Partial<QuotationDraftLine>) => void;
  onSummaryClick: (e: React.MouseEvent<HTMLElement>) => void;
  readOnly?: boolean;
};

function PlotBlock({
  plot,
  saving,
  locale,
  isOpen,
  onToggleOpen,
  onPlotName,
  onOpenAddComposite,
  onDragStart,
  onDragOver,
  onDrop,
  onDuplicatePlot,
  onRemovePlot,
  onDuplicateLine,
  onRemoveLine,
  onDragLineStart,
  onDragLineOver,
  onDropLine,
  onPatchLine,
  onSummaryClick,
  readOnly = false,
}: PlotBlockProps) {
  const t = useTranslations("Dashboard.quotations.draft");
  const plotTotal = draftPlotTotal(plot);
  const [plotTitleEdit, setPlotTitleEdit] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) setPlotTitleEdit(false);
  }, [isOpen]);

  return (
    <li
      className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900/50"
      onDragOver={readOnly ? undefined : onDragOver}
      onDrop={readOnly ? undefined : onDrop}
    >
      <details open={isOpen}>
        <summary
          aria-expanded={isOpen}
          className="list-none cursor-pointer select-none"
          onClick={onSummaryClick}
          onKeyDown={(e) => draftSummaryKeyToggle(e, isOpen, onToggleOpen)}
        >
          <div className="border-b border-slate-200 px-2 py-2 dark:border-slate-600">
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-2"
              draggable={!saving && !readOnly}
              onDragStart={
                readOnly
                  ? undefined
                  : (e) => {
                      const el = e.target as HTMLElement;
                      if (el.closest("textarea, input")) {
                        e.preventDefault();
                        return;
                      }
                      onDragStart(e);
                    }
              }
            >
              <button
                type="button"
                disabled={saving}
                className="-m-1 inline-flex shrink-0 rounded p-1 text-slate-400"
                aria-label={t("toggleRowExpand")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleOpen(!isOpen);
                }}
              >
                <ChevronDown
                  className={cn("size-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
                  aria-hidden
                />
              </button>
              {readOnly ? (
                <>
                  <div className="min-h-[2rem] min-w-0 flex-1 px-0.5 py-1 text-left text-sm font-medium leading-snug break-words text-slate-800 dark:text-slate-100">
                    {plot.name?.trim() || t("newPlotPlaceholder")}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                      {formatMoneyDisplay(plotTotal, locale)}
                    </span>
                  </div>
                </>
              ) : isOpen && plotTitleEdit ? (
                <DraftAutosizeTitleTextarea
                  value={plot.name}
                  onValueChange={onPlotName}
                  onBlur={() => {
                    setPlotTitleEdit(false);
                    const raw = plot.name;
                    const next = capitalizeFirstLetter(raw);
                    if (next !== raw) onPlotName(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
                  }}
                  disabled={saving}
                  aria-label={t("newPlotPlaceholder")}
                  className="min-h-[2rem] font-medium"
                  autoFocus
                />
              ) : (
                <div className="group/draftPlotTitle flex min-w-0 flex-1 items-start justify-start gap-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    className={cn(
                      inlineEditClassName,
                      "min-h-[2rem] w-fit min-w-0 max-w-full cursor-pointer rounded-md px-0.5 py-1 text-left font-medium leading-snug break-words",
                      "text-slate-800 dark:text-slate-100",
                    )}
                    aria-label={t("toggleRowExpand")}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleOpen(!isOpen);
                    }}
                  >
                    {plot.name?.trim() || t("newPlotPlaceholder")}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className={cn(
                      "-m-0.5 mt-0.5 shrink-0 rounded p-1 text-slate-400 transition-opacity duration-150",
                      "opacity-0 group-hover/draftPlotTitle:opacity-100 hover:text-slate-600 dark:hover:text-slate-300",
                      "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/80 dark:focus-visible:ring-slate-500/80",
                    )}
                    aria-label={t("editRowName")}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleOpen(true);
                      setPlotTitleEdit(true);
                    }}
                  >
                    <Pencil className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  </button>
                </div>
              )}
              {!readOnly ? (
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  className={cn(
                    inlineEditClassName,
                    "cursor-pointer text-xs tabular-nums text-slate-600 dark:text-slate-300",
                  )}
                  aria-label={t("toggleRowExpand")}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleOpen(!isOpen);
                  }}
                >
                  {formatMoneyDisplay(plotTotal, locale)}
                </button>
                <div data-draft-row-actions className="shrink-0">
                  <DataTableRowActionsMenu
                    menuAriaLabel={t("rowActions")}
                    items={[
                      {
                        id: "dup-plot",
                        label: t("duplicatePlot"),
                        icon: Copy,
                        onSelect: onDuplicatePlot,
                      },
                      {
                        id: "del-plot",
                        label: t("removePlot"),
                        icon: Trash2,
                        tone: "danger",
                        onSelect: onRemovePlot,
                      },
                    ]}
                  />
                </div>
              </div>
              ) : null}
            </div>
          </div>
        </summary>

        <div className="m-2 space-y-3">
          {!readOnly ? (
            <div className="flex flex-wrap items-center justify-start gap-2">
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={saving}
                onClick={() => onOpenAddComposite()}
              >
                <Plus className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {t("addComposite")}
              </AppButton>
            </div>
          ) : null}
          <CompositeDraftLinesBody
            pins={plot.pins}
            saving={saving}
            locale={locale}
            emptyHint={t("emptyLines")}
            labels={{
              qty: t("qty"),
              unitPrice: t("unitPrice"),
              duplicateLine: t("duplicateLine"),
              removeLine: t("removeLine"),
              rowActions: t("rowActions"),
            }}
            onDuplicateLine={onDuplicateLine}
            onRemoveLine={onRemoveLine}
            onPatchLine={onPatchLine}
            readOnly={readOnly}
            drag={
              readOnly
                ? undefined
                : {
                    onDragLineStart,
                    onDragLineOver,
                    onDropLine,
                  }
            }
          />
        </div>
      </details>
    </li>
  );
}
