"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";
import {
  createFormRenderRule,
  deleteFormRenderRule,
  fetchFormRenderRulesByProjectForm,
  fetchProjectFormMetadata,
  updateFormRenderRule,
  type FormMetadataSection,
  type FormRenderRuleGroup,
  type FormRenderRuleItem,
} from "@/features/rules/api/rule.api";
import {
  RuleBlockCard,
  makeBlock,
  type RuleBlock,
} from "@/features/rules/components/rule-block-card";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { AppButton, DataTablePaginationBar } from "@/shared/ui";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";

/* ─────────────────────────── helpers ─────────────────────────── */

function SeverityBadge({ value }: { value?: string | null }) {
  const text = value ?? "";
  const color =
    text.includes("SERIOUS") || text.includes("HIGH")
      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      : text.includes("MODERATE") || text.includes("MEDIUM")
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      : text.includes("MINOR") || text.includes("LOW")
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}
    >
      {text || "—"}
    </span>
  );
}

/* ─────────────────────── RulesList ─────────────────────────── */

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function RulesList({ rules }: { rules: FormRenderRuleItem[] }) {
  if (rules.length === 0) {
    return (
      <p className="px-5 py-6 text-center text-xs text-slate-500 dark:text-slate-400 italic">
        No rules configured for this group.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rules.map((rule, idx) => (
        <div
          key={rule.id ?? idx}
          className="rounded-sm border border-slate-200 bg-white p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Section header */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {rule.section_code}
            </span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {rule.section_label}
            </span>
            <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
              Order: {rule.display_order}
            </span>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Action Fields */}
            <LabeledField label="Action Fields">
              <div className="flex flex-wrap gap-1">
                {(rule.action_api_names ?? []).map((name, i) => (
                  <span
                    key={`${name}-${i}`}
                    className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </LabeledField>

            {/* Trigger Condition */}
            <LabeledField label="Trigger Condition">
              {rule.trigger_condition ? (
                <div className="rounded bg-blue-50/70 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50 px-2 py-1 text-[11px] space-y-0.5">
                  <p className="font-mono text-blue-700 dark:text-blue-300 break-all">
                    {rule.trigger_condition.field}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">{rule.trigger_condition.operator}</span>{" "}
                    &ldquo;{rule.trigger_condition.value}&rdquo;
                  </p>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                  Always active
                </span>
              )}
            </LabeledField>

            {/* Severity */}
            <LabeledField label="Severity">
              <SeverityBadge value={rule.default_severity} />
            </LabeledField>

            {/* Timescale */}
            <LabeledField label="Timescale">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                {rule.default_timescale}
              </span>
            </LabeledField>

            {/* Missing Data Behavior */}
            <LabeledField label="Missing Data Behavior">
              <span
                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                  rule.missing_data_behavior === "fail"
                    ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    : rule.missing_data_behavior === "warn"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {rule.missing_data_behavior}
              </span>
            </LabeledField>

            {/* Category */}
            <LabeledField label="Category">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {rule.default_category || "—"}
              </p>
            </LabeledField>

            {/* Ignore Values */}
            <LabeledField label="Ignore Values">
              <div className="flex flex-wrap gap-1">
                {(rule.ignore_values ?? []).map((v, i) => (
                  <span
                    key={i}
                    className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  >
                    {v === "" ? '""' : v}
                  </span>
                ))}
              </div>
            </LabeledField>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────── RuleDetailPanel ────────────────────── */

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

export function RuleDetailPanel({
  projectFormId,
}: {
  projectFormId: string | number;
  formName?: string;
}) {
  const [groups, setGroups] = React.useState<FormRenderRuleGroup[]>([]);
  const [sections, setSections] = React.useState<FormMetadataSection[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editBlocks, setEditBlocks] = React.useState<RuleBlock[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  const loadRules = React.useCallback(async () => {
    const res = await fetchFormRenderRulesByProjectForm(projectFormId);
    setGroups(Array.isArray(res.groups) ? res.groups : []);
  }, [projectFormId]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const [res, meta] = await Promise.all([
          fetchFormRenderRulesByProjectForm(projectFormId),
          fetchProjectFormMetadata(projectFormId).catch(() => []),
        ]);
        if (!cancelled) {
          setGroups(Array.isArray(res.groups) ? res.groups : []);
          setSections(Array.isArray(meta) ? meta : []);
          setPage(1);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load rules.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectFormId]);

  const resolvedFormName =
    groups[0]?.project_form_info?.name ??
    groups[0]?.dynamic_form_info?.name ??
    `Form #${projectFormId}`;

  const allRules = React.useMemo(
    () => groups.flatMap((g) => g.rules ?? []),
    [groups],
  );
  const totalRecords = allRules.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRules = React.useMemo(
    () => allRules.slice((safePage - 1) * pageSize, safePage * pageSize),
    [allRules, safePage, pageSize],
  );

  const pageRange = getListPageRange({
    current_page: safePage,
    page_size: pageSize,
    total_records: totalRecords,
  });

  const enterEditMode = React.useCallback(() => {
    const mapped: RuleBlock[] = allRules.map((r) => {
      const matchedSection = sections.find(
        (s) => s.code === r.section_code || s.label === r.section_label,
      );
      return makeBlock({
        ruleId: r.id,
        selectedSectionCode: matchedSection?.code ?? r.section_code,
        sectionLabelFallback: r.section_label,
        actionApiNames: r.action_api_names ?? [],
        defaultCategory: r.default_category ?? "",
        defaultTimescale: r.default_timescale || "3 MONTHS",
        defaultSeverity: r.default_severity || "SERIOUS BREACH",
        missingDataBehavior: r.missing_data_behavior || "skip",
        ignoreValuesText: (r.ignore_values ?? []).join(", "),
        hasTrigger: r.trigger_condition !== null,
        triggerField: r.trigger_condition?.field ?? "",
        triggerOperator: r.trigger_condition?.operator ?? "equals",
        triggerValue: r.trigger_condition?.value ?? "",
      });
    });
    setEditBlocks(mapped.length > 0 ? mapped : [makeBlock()]);
    setEditError(null);
    setIsEditing(true);
  }, [allRules, sections]);

  const cancelEditMode = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const updateBlock = (index: number, patch: Partial<RuleBlock>) => {
    setEditBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const removeBlock = (index: number) => {
    setEditBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const addBlock = () => {
    const used = new Set(editBlocks.map((b) => b.selectedSectionCode).filter(Boolean));
    const nextSection = sections.find((s) => !used.has(s.code));
    if (sections.length > 0 && !nextSection) return;
    setEditBlocks((prev) => [
      ...prev,
      makeBlock({ selectedSectionCode: nextSection?.code ?? "" }),
    ]);
  };

  const hasUnusedSections =
    sections.length === 0 ||
    sections.some((s) => !editBlocks.some((b) => b.selectedSectionCode === s.code));

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < editBlocks.length; i++) {
      const b = editBlocks[i];
      if (!b.selectedSectionCode) {
        setEditError(`Block ${i + 1}: please select a section.`);
        return;
      }
      if (b.actionApiNames.length === 0) {
        setEditError(`Block ${i + 1}: please select at least one action field.`);
        return;
      }
    }

    try {
      setSaving(true);
      setEditError(null);

      const keptRuleIds = new Set(
        editBlocks.map((b) => b.ruleId).filter((id): id is number => id != null),
      );
      const removedIds = allRules
        .map((r) => r.id)
        .filter((id) => !keptRuleIds.has(id));

      await Promise.all([
        ...editBlocks.map((block, index) => {
          const sec = sections.find((s) => s.code === block.selectedSectionCode);
          const payload = {
            project_form: Number(projectFormId),
            dynamic_form: null,
            section_code: `c${index + 1}`,
            section_label: sec?.label ?? block.sectionLabelFallback ?? block.selectedSectionCode,
            display_order: index + 1,
            action_api_names: block.actionApiNames,
            trigger_condition:
              block.hasTrigger && block.triggerField.trim()
                ? {
                    field: block.triggerField.trim(),
                    operator: block.triggerOperator,
                    value: block.triggerValue,
                  }
                : null,
            missing_data_behavior: block.missingDataBehavior,
            default_category: block.defaultCategory.trim(),
            default_timescale: block.defaultTimescale,
            default_severity: block.defaultSeverity,
            action_delimiter: ":",
            ignore_values: block.ignoreValuesText.split(",").map((v) => v.trim()),
          };
          return block.ruleId != null
            ? updateFormRenderRule(block.ruleId, payload)
            : createFormRenderRule(payload);
        }),
        ...removedIds.map((id) => deleteFormRenderRule(id)),
      ]);

      await loadRules();
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save rules.");
    } finally {
      setSaving(false);
    }
  };

  const headerActions = React.useMemo(() => {
    if (loading || error || allRules.length === 0 || isEditing) return undefined;
    return (
      <AppButton
        type="button"
        variant="secondary"
        onClick={enterEditMode}
        className="gap-1.5"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </AppButton>
    );
  }, [loading, error, allRules.length, isEditing, enterEditMode]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <DetailPageHeader
        title={resolvedFormName}
        subtitle={isEditing ? "Editing Form Render Rules" : "Form Render Rules"}
        backHref={routes.dashboard.settingsRules}
        backAriaLabel="Back to rules"
        actions={headerActions}
      />

      {/* Content */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : isEditing ? (
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {editError}
            </div>
          )}

          {editBlocks.map((block, index) => {
            const usedByOthers = new Set(
              editBlocks
                .filter((_, i) => i !== index)
                .map((b) => b.selectedSectionCode)
                .filter(Boolean),
            );
            return (
              <RuleBlockCard
                key={block.id}
                block={block}
                index={index}
                total={editBlocks.length}
                sections={sections}
                usedSectionCodes={usedByOthers}
                onChange={(patch) => updateBlock(index, patch)}
                onRemove={() => removeBlock(index)}
              />
            );
          })}

          {hasUnusedSections && (
            <button
              type="button"
              onClick={addBlock}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              <Plus className="h-4 w-4" />
              Add Block
            </button>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <AppButton
              type="button"
              variant="secondary"
              onClick={cancelEditMode}
              disabled={saving}
            >
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </AppButton>
          </div>
        </form>
      ) : allRules.length === 0 ? (
        <div className="rounded-sm border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No rules found for this form.
        </div>
      ) : (
        <div className="space-y-4">
          <RulesList rules={paginatedRules} />

          <DataTablePaginationBar
            pagination={{
              current_page: safePage,
              total_pages: totalPages,
              total_records: totalRecords,
            }}
            summary={`Showing ${pageRange.start}–${pageRange.end} of ${totalRecords}`}
            prevLabel="Previous"
            nextLabel="Next"
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPageSelect={(p) => setPage(p)}
            pageSizeControl={{
              listLabel: "Rows per page",
              value: pageSize,
              options: PAGE_SIZE_OPTIONS,
              onChange: (nextSize) => {
                setPageSize(nextSize);
                setPage(1);
              },
              disabled: loading,
            }}
            className="rounded-sm border border-slate-200 dark:border-slate-800"
          />
        </div>
      )}
    </div>
  );
}
