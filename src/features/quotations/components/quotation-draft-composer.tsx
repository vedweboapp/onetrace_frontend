"use client";

import * as React from "react";
import { ChevronDown, Copy, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import { fetchGroup, fetchGroupsPage } from "@/features/groups/api/group.api";
import type { Group, GroupItemRef } from "@/features/groups/types/group.types";
import type { QuotationDraft, QuotationDraftLine, QuotationDraftPlot, QuotationDraftSection } from "@/features/quotations/types/quotation-draft.types";
import { buildQuotationScopeReturnHref } from "@/features/quotations/utils/quotation-block-scope.util";
import { buildQuotationCompositeScopeHref } from "@/features/quotations/utils/quotation-composite-scope-nav.util";
import { quotationDraftLineDisplayName } from "@/features/quotations/utils/quotation-draft-composite-aggregate.util";
import { saveQuotationScopePinDetails } from "@/features/quotations/utils/quotation-composite-scope-pins.util";
import { newQuotationDraftId } from "@/features/quotations/utils/quotation-draft-id.util";
import {
  draftGrandTotal,
  draftPinTotal,
  draftPlotTotal,
  draftSectionTotal,
} from "@/features/quotations/utils/quotation-draft-compute.util";
import { reorderArray } from "@/features/quotations/utils/quotation-draft-ops.util";
import {
  QuotationDraftCompositeLines,
  type CompositeLineLabels,
} from "@/features/quotations/components/quotation-draft-composite-lines";
import { formatMoneyDisplay, parseMoneyValue } from "@/features/quotations/utils/quotation-level-pricing.util";
import { cn } from "@/core/utils/http.util";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn, type QuickCreateSelectApplied } from "@/shared/hooks/use-quick-create-return";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { AppButton, AppModal, CheckmarkSelect, DataTableRowActionsMenu, FieldLabel, surfaceInputClassName } from "@/shared/ui";
import type { CheckmarkSelectOption } from "@/shared/ui";

type DndPayload =
  | { scope: "section"; fromIndex: number }
  | { scope: "plot"; sectionIndex: number; fromIndex: number }
  | { scope: "line"; sectionIndex: number; plotIndex: number; fromIndex: number }
  | { scope: "section-line"; sectionIndex: number; fromIndex: number };

const DND_TYPE = "application/x-quotation-draft";

const DUPLICATE_COUNT_MIN = 1;
const DUPLICATE_COUNT_MAX = 50;

function clampDuplicateCount(n: number): number {
  if (!Number.isFinite(n)) return DUPLICATE_COUNT_MIN;
  return Math.min(DUPLICATE_COUNT_MAX, Math.max(DUPLICATE_COUNT_MIN, Math.floor(n)));
}

function draftCompositeRowKey(sectionId: string, plotId: string | null) {
  return plotId == null ? `sec:${sectionId}` : `plot:${sectionId}:${plotId}`;
}

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

function DraftCompositeAddRow({
  idPrefix,
  saving,
  groupOptions,
  compositeOptions,
  groupId,
  compositeId,
  onGroupChange,
  onCompositeChange,
  onSave,
  saveDisabled,
  showNoItemsMessage,
  saveLabel,
  onGroupAdd,
  addGroupAriaLabel,
  addGroupLabel,
  onCompositeAdd,
  addCompositeAriaLabel,
  addCompositeLabel,
}: {
  idPrefix: string;
  saving: boolean;
  groupOptions: CheckmarkSelectOption[];
  compositeOptions: CheckmarkSelectOption[];
  groupId: string;
  compositeId: string;
  onGroupChange: (v: string) => void;
  onCompositeChange: (v: string) => void;
  onSave: () => void;
  saveDisabled: boolean;
  showNoItemsMessage: boolean;
  saveLabel: string;
  onGroupAdd?: () => void;
  addGroupAriaLabel?: string;
  addGroupLabel?: string;
  onCompositeAdd?: () => void;
  addCompositeAriaLabel?: string;
  addCompositeLabel?: string;
}) {
  const tDraw = useTranslations("Dashboard.projects.drawings.editor");
  const t = useTranslations("Dashboard.quotations.draft");
  return (
    <div className="w-full min-w-0 space-y-1.5" data-draft-composite-add>
      <div className="flex max-w-3xl min-w-0 flex-row flex-wrap items-end gap-1.5">
        <div className="min-w-0 flex-1 sm:min-w-[11rem]">
          <CheckmarkSelect
            id={`${idPrefix}-group`}
            portaled
            searchable
            listLabel={`${tDraw("chooseGroup")} *`}
            options={groupOptions}
            value={groupId}
            emptyLabel={tDraw("allGroups")}
            disabled={saving}
            onChange={onGroupChange}
            onAdd={onGroupAdd}
            addAriaLabel={addGroupAriaLabel}
            addLabel={addGroupLabel}
            className="w-full"
          />
        </div>
        <div className="min-w-0 flex-1 sm:min-w-[11rem]">
          <CheckmarkSelect
            id={`${idPrefix}-composite`}
            portaled
            searchable
            listLabel={`${t("chooseItem")} *`}
            options={compositeOptions}
            value={compositeId}
            emptyLabel={t("selectItem")}
            disabled={compositeOptions.length <= 1 || saving}
            onChange={onCompositeChange}
            onAdd={onCompositeAdd}
            addAriaLabel={addCompositeAriaLabel}
            addLabel={addCompositeLabel}
            className="w-full"
          />
        </div>
        <AppButton type="button" variant="secondary" size="sm" disabled={saveDisabled || saving} onClick={onSave}>
          {saveLabel}
        </AppButton>
      </div>
      {showNoItemsMessage ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("noItems")}</p>
      ) : null}
    </div>
  );
}

type DuplicatePrompt =
  | { kind: "section"; si: number }
  | { kind: "plot"; si: number; pi: number }
  | { kind: "line"; si: number; pi: number; li: number }
  | { kind: "section-line"; si: number; li: number };

type Props = {
  draft: QuotationDraft | null;
  onDraftChange: React.Dispatch<React.SetStateAction<QuotationDraft | null>>;
  saving: boolean;
  canShow: boolean;
  /** When true, scope is view-only: no edits, adds, deletes, or drag-reorder. */
  readOnly?: boolean;
};

export function QuotationDraftComposer({
  draft,
  onDraftChange,
  saving,
  canShow,
  readOnly = false,
}: Props) {
  const t = useTranslations("Dashboard.quotations.draft");
  const tDraw = useTranslations("Dashboard.projects.drawings.editor");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const compositeFormId = React.useId();
  const router = useRouter();
  const pathname = usePathname();

  const [newSectionName, setNewSectionName] = React.useState("");
  const [rowPick, setRowPick] = React.useState<Record<string, { groupId: string; compositeId: string }>>({});
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [itemRows, setItemRows] = React.useState<Item[]>([]);
  const [groupItemsByGroupId, setGroupItemsByGroupId] = React.useState<Record<string, GroupItemRef[]>>({});
  const [openSectionIds, setOpenSectionIds] = React.useState<Set<string>>(() => new Set());
  const [openPlotIds, setOpenPlotIds] = React.useState<Set<string>>(() => new Set());
  const [sectionTitleEditId, setSectionTitleEditId] = React.useState<string | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = React.useState<DuplicatePrompt | null>(null);
  const [duplicateCountInput, setDuplicateCountInput] = React.useState("1");
  const [duplicateCountError, setDuplicateCountError] = React.useState<string | null>(null);
  const duplicateCountFieldId = React.useId();

  const compositeLineLabels = React.useMemo<CompositeLineLabels>(
    () => ({
      duplicateLine: t("duplicateLine"),
      removeLine: t("removeLine"),
      rowActions: t("rowActions"),
    }),
    [t],
  );

  const groupOptions = React.useMemo(
    () => [{ value: "", label: tDraw("allGroups") }, ...groups.map((g) => ({ value: String(g.id), label: g.name }))],
    [groups, tDraw],
  );

  const getCompositeOptions = React.useCallback(
    (groupId: string): CheckmarkSelectOption[] => {
      if (!groupId) {
        return [
          { value: "", label: t("selectItem") },
          ...itemRows.map((ci) => ({ value: String(ci.id), label: ci.name })),
        ];
      }
      const entries = groupItemsByGroupId[groupId];
      if (entries === undefined) {
        return [{ value: "", label: t("selectItem") }];
      }
      const itemNameById: Record<number, string> = {};
      for (const ci of itemRows) itemNameById[ci.id] = ci.name;
      const uniqueByItem = new Map<number, { value: string; label: string }>();
      for (const entry of entries) {
        if (uniqueByItem.has(entry.item)) continue;
        uniqueByItem.set(entry.item, {
          value: String(entry.item),
          label: entry.item_name ?? itemNameById[entry.item] ?? `#${entry.item}`,
        });
      }
      return [{ value: "", label: t("selectItem") }, ...Array.from(uniqueByItem.values())];
    },
    [itemRows, groupItemsByGroupId, t],
  );

  const pendingRowKeyRef = React.useRef<string | null>(null);

  const reloadGroupsAndItems = React.useCallback(async () => {
    try {
      const [gRes, iRes] = await Promise.all([fetchGroupsPage(1, 500), fetchItemsPage(1, 500)]);
      setGroups(gRes.items);
      setItemRows(iRes.items);
    } catch {
      setGroups([]);
      setItemRows([]);
    }
  }, []);

  const getFormDraft = React.useCallback(
    () => ({ draft, rowPick, newSectionName }),
    [draft, rowPick, newSectionName],
  );

  const restoreFormDraft = React.useCallback(
    (saved: unknown) => {
      const data = saved as {
        draft?: QuotationDraft | null;
        rowPick?: Record<string, { groupId: string; compositeId: string }>;
        newSectionName?: string;
      };
      if (data.draft !== undefined) onDraftChange(data.draft);
      if (data.rowPick) setRowPick(data.rowPick);
      if (typeof data.newSectionName === "string") setNewSectionName(data.newSectionName);
    },
    [onDraftChange],
  );

  const applyQuickCreateSelect = React.useCallback(({ selectTarget, selectId }: QuickCreateSelectApplied) => {
    const key = pendingRowKeyRef.current;
    if (!key) return;
    if (selectTarget === "group") {
      setRowPick((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? { groupId: "", compositeId: "" }), groupId: selectId, compositeId: "" },
      }));
      void fetchGroup(Number.parseInt(selectId, 10))
        .then((row) => {
          setGroupItemsByGroupId((cur) => ({ ...cur, [selectId]: row.items ?? [] }));
        })
        .catch(() => {
          setGroupItemsByGroupId((cur) => ({ ...cur, [selectId]: [] }));
        });
    } else if (selectTarget === "item") {
      setRowPick((prev) => {
        const cur = prev[key] ?? { groupId: "", compositeId: "" };
        return { ...prev, [key]: { ...cur, compositeId: selectId } };
      });
    }
    pendingRowKeyRef.current = null;
  }, []);

  const groupQuickCreate = useQuickCreate({
    kind: "group",
    getFormDraft: readOnly ? undefined : getFormDraft,
  });

  const itemQuickCreate = useQuickCreate({
    kind: "item",
    getFormDraft: readOnly ? undefined : getFormDraft,
  });

  const bindQuickCreateToRow = React.useCallback(
    (rowKey: string) => ({
      onGroupAdd: groupQuickCreate.onAdd
        ? () => {
            pendingRowKeyRef.current = rowKey;
            groupQuickCreate.onAdd?.();
          }
        : undefined,
      addGroupAriaLabel: groupQuickCreate.addAriaLabel,
      addGroupLabel: groupQuickCreate.addLabel,
      onCompositeAdd: itemQuickCreate.onAdd
        ? () => {
            pendingRowKeyRef.current = rowKey;
            itemQuickCreate.onAdd?.();
          }
        : undefined,
      addCompositeAriaLabel: itemQuickCreate.addAriaLabel,
      addCompositeLabel: itemQuickCreate.addLabel,
    }),
    [groupQuickCreate, itemQuickCreate],
  );

  useQuickCreateReturn({
    restoreFormDraft: readOnly ? undefined : restoreFormDraft,
    onReloadOptions: readOnly ? undefined : reloadGroupsAndItems,
    onApplySelect: readOnly ? () => {} : applyQuickCreateSelect,
  });

  React.useEffect(() => {
    if (readOnly || !canShow) return;
    let cancelled = false;
    (async () => {
      try {
        const [gRes, iRes] = await Promise.all([fetchGroupsPage(1, 500), fetchItemsPage(1, 500)]);
        if (!cancelled) {
          setGroups(gRes.items);
          setItemRows(iRes.items);
        }
      } catch {
        if (!cancelled) {
          setGroups([]);
          setItemRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readOnly, canShow]);

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

  function duplicateSectionAt(si: number, count: number) {
    const n = clampDuplicateCount(count);
    patchDraft((d) => {
      const source = d.sections[si];
      if (!source) return d;
      const clones: QuotationDraftSection[] = [];
      for (let i = 0; i < n; i++) {
        clones.push({
          ...source,
          id: newQuotationDraftId("sec"),
          name: source.name,
          section_pins: (source.section_pins ?? []).map((ln) => ({ ...ln, id: newQuotationDraftId("line") })),
          plots: source.plots.map((p) => ({
            ...p,
            id: newQuotationDraftId("plot"),
            pins: p.pins.map((ln) => ({ ...ln, id: newQuotationDraftId("line") })),
          })),
        });
      }
      const sections = [...d.sections];
      sections.splice(si + 1, 0, ...clones);
      return { sections };
    });
  }

  function deleteSection(si: number) {
    patchDraft((d) => ({ sections: d.sections.filter((_, i) => i !== si) }));
  }

  function duplicatePlotAt(si: number, pi: number, count: number) {
    const n = clampDuplicateCount(count);
    patchDraft((d) => {
      const sec = d.sections[si];
      const plot = sec?.plots[pi];
      if (!sec || !plot) return d;
      const clones: QuotationDraftPlot[] = [];
      for (let i = 0; i < n; i++) {
        clones.push({
          ...plot,
          id: newQuotationDraftId("plot"),
          name: plot.name,
          pins: plot.pins.map((ln) => ({ ...ln, id: newQuotationDraftId("line") })),
        });
      }
      const plots = [...sec.plots];
      plots.splice(pi + 1, 0, ...clones);
      return { sections: d.sections.map((s, i) => (i === si ? { ...s, plots } : s)) };
    });
  }

  function removePlot(si: number, pi: number) {
    patchDraft((d) => {
      const sections = d.sections.map((s, i) => (i === si ? { ...s, plots: s.plots.filter((_, j) => j !== pi) } : s));
      return { sections };
    });
  }

  function duplicateLineAt(si: number, pi: number, li: number, count: number) {
    const n = clampDuplicateCount(count);
    patchDraft((d) => {
      const line = d.sections[si]?.plots[pi]?.pins[li];
      if (!line) return d;
      const clones = Array.from({ length: n }, () => ({
        ...line,
        id: newQuotationDraftId("line"),
        pin_count: 1,
        quantity: 1,
      }));
      const plotPins = [...d.sections[si].plots[pi].pins];
      plotPins.splice(li + 1, 0, ...clones);
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

  function duplicateSectionLineAt(si: number, li: number, count: number) {
    const n = clampDuplicateCount(count);
    patchDraft((d) => {
      const sec = d.sections[si];
      if (!sec) return d;
      const prevPins = sec.section_pins ?? [];
      const line = prevPins[li];
      if (!line) return d;
      const clones = Array.from({ length: n }, () => ({
        ...line,
        id: newQuotationDraftId("line"),
        pin_count: 1,
        quantity: 1,
      }));
      const section_pins = [...prevPins];
      section_pins.splice(li + 1, 0, ...clones);
      return {
        sections: d.sections.map((s, i) => (i === si ? { ...s, section_pins } : s)),
      };
    });
  }

  function openDuplicatePrompt(next: DuplicatePrompt) {
    if (readOnly) return;
    setDuplicateCountInput("1");
    setDuplicateCountError(null);
    setDuplicatePrompt(next);
  }

  function closeDuplicatePrompt() {
    if (saving) return;
    setDuplicatePrompt(null);
    setDuplicateCountError(null);
  }

  function confirmDuplicatePrompt() {
    if (!duplicatePrompt || readOnly) return;
    const raw = duplicateCountInput.trim();
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < DUPLICATE_COUNT_MIN || parsed > DUPLICATE_COUNT_MAX) {
      setDuplicateCountError(t("duplicateCountInvalid"));
      return;
    }
    const n = clampDuplicateCount(parsed);
    const p = duplicatePrompt;
    setDuplicatePrompt(null);
    setDuplicateCountInput("1");
    setDuplicateCountError(null);
    switch (p.kind) {
      case "section":
        duplicateSectionAt(p.si, n);
        break;
      case "plot":
        duplicatePlotAt(p.si, p.pi, n);
        break;
      case "line":
        duplicateLineAt(p.si, p.pi, p.li, n);
        break;
      case "section-line":
        duplicateSectionLineAt(p.si, p.li, n);
        break;
    }
  }

  function removeSectionLine(si: number, li: number) {
    patchDraft((d) => ({
      sections: d.sections.map((s, i) =>
        i === si ? { ...s, section_pins: (s.section_pins ?? []).filter((_, k) => k !== li) } : s,
      ),
    }));
  }

  function removeSectionCompositeLines(si: number, indices: number[]) {
    const sorted = [...indices].sort((a, b) => b - a);
    patchDraft((d) => {
      const pins = [...(d.sections[si]?.section_pins ?? [])];
      for (const li of sorted) pins.splice(li, 1);
      return {
        sections: d.sections.map((s, i) => (i === si ? { ...s, section_pins: pins } : s)),
      };
    });
  }

  function removePlotCompositeLines(si: number, pi: number, indices: number[]) {
    const sorted = [...indices].sort((a, b) => b - a);
    patchDraft((d) => {
      const plot = d.sections[si]?.plots[pi];
      if (!plot) return d;
      const pins = [...plot.pins];
      for (const li of sorted) pins.splice(li, 1);
      return {
        sections: d.sections.map((s, i) =>
          i === si ? { ...s, plots: s.plots.map((p, j) => (j === pi ? { ...p, pins } : p)) } : s,
        ),
      };
    });
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

  function handleGroupPickChange(rowKey: string, g: string) {
    setRowPick((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] ?? { groupId: "", compositeId: "" }), groupId: g, compositeId: "" },
    }));
    if (!g) return;
    void fetchGroup(Number.parseInt(g, 10))
      .then((row) => {
        setGroupItemsByGroupId((cur) => ({ ...cur, [g]: row.items ?? [] }));
      })
      .catch(() => {
        setGroupItemsByGroupId((cur) => ({ ...cur, [g]: [] }));
      });
  }

  function addCompositeLineForKey(si: number, pi: number | null, sectionId: string, plotId: string | null) {
    if (readOnly) return;
    const key = draftCompositeRowKey(sectionId, plotId);
    const row = rowPick[key] ?? { groupId: "", compositeId: "" };
    const pickVal = row.compositeId;
    if (!pickVal) return;
    const id = Number.parseInt(pickVal, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    const opts = getCompositeOptions(row.groupId);
    const picked = itemRows.find((r) => r.id === id);
    const label = picked?.name ?? opts.find((o) => o.value === pickVal)?.label ?? `Item ${id}`;
    const unit = picked ? parseMoneyValue(picked.selling_price ?? picked.cost_price) : 0;
    const newLine: QuotationDraftLine = {
      id: newQuotationDraftId("line"),
      pin_id: null,
      composite_item_id: id,
      name: label,
      quantity: 1,
      selling_price: unit,
      pin_count: 1,
    };
    if (pi === null) {
      patchDraft((d) => ({
        sections: d.sections.map((s, i) => (i === si ? { ...s, section_pins: [...(s.section_pins ?? []), newLine] } : s)),
      }));
    } else {
      patchDraft((d) => ({
        sections: d.sections.map((s, i) =>
          i === si
            ? {
                ...s,
                plots: s.plots.map((p, j) => (j === pi ? { ...p, pins: [...p.pins, newLine] } : p)),
              }
            : s,
        ),
      }));
    }
    setRowPick((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function onSectionSummaryClick(e: React.MouseEvent<HTMLElement>, sectionId: string, isOpen: boolean) {
    const el = e.target as HTMLElement;
    if (el.closest("textarea, input") || el.closest("[data-draft-row-actions]") || el.closest("[data-draft-composite-add]")) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    toggleSectionOpen(sectionId, !isOpen);
  }

  function onPlotSummaryClick(e: React.MouseEvent<HTMLElement>, plotId: string, isOpen: boolean) {
    const el = e.target as HTMLElement;
    if (el.closest("textarea, input") || el.closest("[data-draft-row-actions]") || el.closest("[data-draft-composite-add]")) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    togglePlotOpen(plotId, !isOpen);
  }

  const openCompositeScope = React.useCallback(
    (args: {
      compositeItemId: number;
      displayName: string;
      sectionLabel?: string;
      plotLabel?: string;
      pins: QuotationDraftLine[];
      lineIndices: number[];
    }) => {
      const rows = args.lineIndices
        .map((lineIndex, idx) => {
          const pin = args.pins[lineIndex];
          if (!pin) return null;
          const qty = Number.isFinite(pin.quantity) ? pin.quantity : 0;
          const unit = Number.isFinite(pin.selling_price) ? pin.selling_price : 0;
          return {
            pins_order: idx,
            pin_id: typeof pin.pin_id === "number" && Number.isFinite(pin.pin_id) ? pin.pin_id : null,
            name: quotationDraftLineDisplayName(pin),
            quantity: qty,
            selling_price: unit,
            pins_total: qty * unit,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row != null);
      const detailsKey = saveQuotationScopePinDetails({
        title: args.displayName,
        sectionLabel: args.sectionLabel,
        plotLabel: args.plotLabel,
        rows,
      });
      const backHref = buildQuotationScopeReturnHref(pathname);
      const editMatch = pathname.match(/\/dashboard\/quotations\/(\d+)\/edit$/);
      const detailMatch = pathname.match(/\/dashboard\/quotations\/(\d+)$/);
      const context = editMatch
        ? { mode: "edit" as const, quotationId: Number.parseInt(editMatch[1], 10) }
        : detailMatch
          ? { mode: "detail" as const, quotationId: Number.parseInt(detailMatch[1], 10) }
          : ({ mode: "new" as const });
      let href = buildQuotationCompositeScopeHref(context, {
        compositeItemId: args.compositeItemId,
        repeatCount: rows.length,
        sectionLabel: args.sectionLabel,
        plotLabel: args.plotLabel,
        backHref,
      });
      if (detailsKey) {
        const sep = href.includes("?") ? "&" : "?";
        href = `${href}${sep}pinDetailsKey=${encodeURIComponent(detailsKey)}`;
      }
      router.push(href);
    },
    [router, pathname],
  );

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
            <AppButton type="button" variant="secondary" size="sm" disabled={saving || newSectionName.trim().length === 0} onClick={addSection}>
              {t("addSection")}
            </AppButton>
          </div>
        </>
      ) : null}

      {draft.sections.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("emptySections")}</p>
      ) : (
        <ul className="space-y-3">
          {draft.sections.map((section, si) => {
            const secKey = draftCompositeRowKey(section.id, null);
            const secPick = rowPick[secKey] ?? { groupId: "", compositeId: "" };
            const secGroupId = secPick.groupId;
            const secCompositeOpts = getCompositeOptions(secGroupId);
            const secSaveDisabled =
              !secPick.compositeId ||
              secCompositeOpts.length <= 1 ||
              (Boolean(secGroupId) && groupItemsByGroupId[secGroupId] === undefined);

            return (
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
                                onSelect: () => openDuplicatePrompt({ kind: "section", si }),
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
                    <DraftCompositeAddRow
                      idPrefix={`${compositeFormId}-s-${section.id}`}
                      saving={saving}
                      groupOptions={groupOptions}
                      compositeOptions={secCompositeOpts}
                      groupId={secGroupId}
                      compositeId={secPick.compositeId}
                      onGroupChange={(g) => handleGroupPickChange(secKey, g)}
                      onCompositeChange={(c) =>
                        setRowPick((prev) => {
                          const cur = prev[secKey] ?? { groupId: "", compositeId: "" };
                          return { ...prev, [secKey]: { ...cur, compositeId: c } };
                        })
                      }
                      onSave={() => addCompositeLineForKey(si, null, section.id, null)}
                      saveDisabled={secSaveDisabled}
                      showNoItemsMessage={itemRows.length === 0}
                      saveLabel={t("saveComposite")}
                    />
                  ) : null}
                  <QuotationDraftCompositeLines
                    hideWhenEmpty
                    pins={section.section_pins ?? []}
                    saving={saving}
                    locale={loc}
                    labels={compositeLineLabels}
                    onDuplicateLine={(li) => openDuplicatePrompt({ kind: "section-line", si, li })}
                    onRemoveLines={(indices) => removeSectionCompositeLines(si, indices)}
                    onCompositeClick={({ compositeItemId, displayName, lineIndices }) => {
                      const fallbackCompositeId = lineIndices
                        .map((lineIndex) => section.section_pins?.[lineIndex]?.composite_item_id ?? null)
                        .find((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0);
                      const targetCompositeId = compositeItemId ?? fallbackCompositeId;
                      if (!targetCompositeId) return;
                      openCompositeScope({
                        compositeItemId: targetCompositeId,
                        displayName,
                        sectionLabel: section.name,
                        pins: section.section_pins ?? [],
                        lineIndices,
                      });
                    }}
                    readOnly={readOnly}
                  />

                  {(section.section_pins ?? []).length === 0 && section.plots.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("emptyPlots")}</p>
                  ) : section.plots.length > 0 ? (
                    <ul className="space-y-2">
                      {section.plots.map((plot, pi) => {
                        const plotKey = draftCompositeRowKey(section.id, plot.id);
                        const plotPick = rowPick[plotKey] ?? { groupId: "", compositeId: "" };
                        const plotGroupId = plotPick.groupId;
                        const plotCompositeOpts = getCompositeOptions(plotGroupId);
                        const plotSaveDisabled =
                          !plotPick.compositeId ||
                          plotCompositeOpts.length <= 1 ||
                          (Boolean(plotGroupId) && groupItemsByGroupId[plotGroupId] === undefined);

                        return (
                        <PlotBlock
                          key={plot.id}
                          plot={plot}
                          saving={saving}
                          locale={loc}
                          isOpen={openPlotIds.has(plot.id)}
                          onToggleOpen={(open) => togglePlotOpen(plot.id, open)}
                          onPlotName={(name) => updatePlotName(si, pi, name)}
                          addCompositeToolbar={
                            readOnly ? null : (
                            <DraftCompositeAddRow
                              idPrefix={`${compositeFormId}-p-${section.id}-${plot.id}`}
                              saving={saving}
                              groupOptions={groupOptions}
                              compositeOptions={plotCompositeOpts}
                              groupId={plotGroupId}
                              compositeId={plotPick.compositeId}
                              onGroupChange={(g) => handleGroupPickChange(plotKey, g)}
                              onCompositeChange={(c) =>
                                setRowPick((prev) => {
                                  const cur = prev[plotKey] ?? { groupId: "", compositeId: "" };
                                  return { ...prev, [plotKey]: { ...cur, compositeId: c } };
                                })
                              }
                              onSave={() => addCompositeLineForKey(si, pi, section.id, plot.id)}
                              saveDisabled={plotSaveDisabled}
                              showNoItemsMessage={itemRows.length === 0}
                              {...bindQuickCreateToRow(plotKey)}
                              saveLabel={t("saveComposite")}
                            />
                            )
                          }
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
                          onDuplicatePlot={() => openDuplicatePrompt({ kind: "plot", si, pi })}
                          onRemovePlot={() => removePlot(si, pi)}
                          compositeLineLabels={compositeLineLabels}
                          onDuplicateLine={(li) => openDuplicatePrompt({ kind: "line", si, pi, li })}
                          onRemoveLines={(indices) => removePlotCompositeLines(si, pi, indices)}
                          onCompositeClick={({ compositeItemId, displayName, lineIndices }) => {
                            const fallbackCompositeId = lineIndices
                              .map((lineIndex) => plot.pins?.[lineIndex]?.composite_item_id ?? null)
                              .find((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0);
                            const targetCompositeId = compositeItemId ?? fallbackCompositeId;
                            if (!targetCompositeId) return;
                            openCompositeScope({
                              compositeItemId: targetCompositeId,
                              displayName,
                              sectionLabel: section.name,
                              plotLabel: plot.name,
                              pins: plot.pins,
                              lineIndices,
                            });
                          }}
                          onSummaryClick={(e) => onPlotSummaryClick(e, plot.id, openPlotIds.has(plot.id))}
                          readOnly={readOnly}
                        />
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </details>
            </li>
            );
          })}
        </ul>
      )}

      <div className="flex justify-end rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-50">
        <span>
          {t("grandTotal")}: <span className="tabular-nums">{formatMoneyDisplay(grand, loc)}</span>
        </span>
      </div>

      <AppModal
        open={!readOnly && duplicatePrompt !== null}
        onClose={closeDuplicatePrompt}
        title={t("duplicateCountTitle")}
        description={t("duplicateCountDescription")}
        size="sm"
        closeOnBackdrop={!saving}
        isBusy={saving}
        footer={
          <>
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={closeDuplicatePrompt}>
              {t("cancel")}
            </AppButton>
            <AppButton type="button" variant="primary" size="sm" disabled={saving} onClick={confirmDuplicatePrompt}>
              {t("duplicateCountConfirm")}
            </AppButton>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor={duplicateCountFieldId}>{t("duplicateCountLabel")}</FieldLabel>
            <input
              id={duplicateCountFieldId}
              type="number"
              inputMode="numeric"
              min={DUPLICATE_COUNT_MIN}
              max={DUPLICATE_COUNT_MAX}
              value={duplicateCountInput}
              onChange={(e) => {
                setDuplicateCountInput(e.target.value);
                setDuplicateCountError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmDuplicatePrompt();
                }
              }}
              className={cn(surfaceInputClassName, "mt-1.5 w-full max-w-[12rem] tabular-nums")}
              disabled={saving}
              autoFocus
              aria-invalid={duplicateCountError != null}
            />
        
          </div>
          {duplicateCountError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {duplicateCountError}
            </p>
          ) : null}
        </div>
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
  /** Permanent row: group + composite + Save (hidden when `readOnly` or null). */
  addCompositeToolbar: React.ReactNode;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDuplicatePlot: () => void;
  onRemovePlot: () => void;
  compositeLineLabels: CompositeLineLabels;
  onDuplicateLine: (li: number) => void;
  onRemoveLines: (lineIndices: number[]) => void;
  onCompositeClick?: (args: {
    compositeItemId: number;
    repeatCount: number;
    displayName: string;
    lineIndices: number[];
  }) => void;
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
  addCompositeToolbar,
  onDragStart,
  onDragOver,
  onDrop,
  onDuplicatePlot,
  onRemovePlot,
  compositeLineLabels,
  onDuplicateLine,
  onRemoveLines,
  onCompositeClick,
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
          {!readOnly && addCompositeToolbar ? (
            <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2">{addCompositeToolbar}</div>
          ) : null}
          <QuotationDraftCompositeLines
            pins={plot.pins}
            saving={saving}
            locale={locale}
            emptyHint={t("emptyLines")}
            labels={compositeLineLabels}
            onDuplicateLine={onDuplicateLine}
            onRemoveLines={onRemoveLines}
            onCompositeClick={onCompositeClick}
            readOnly={readOnly}
          />
        </div>
      </details>
    </li>
  );
}
