"use client";

import * as React from "react";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  createFormRenderRule,
  fetchProjectFormMetadata,
  fetchProjectFormOptions,
  type FormMetadataSection,
  type ProjectFormOption,
} from "@/features/rules/api/rule.api";
import { routes } from "@/shared/config/routes";
import {
  AppButton,
  FieldLabel,
  MultiCheckSelect,
  SurfaceShell,
  surfaceSelectClassName,
  surfaceInputClassName,
} from "@/shared/ui";

const TIMESCALE_OPTIONS = [
  "IMMEDIATE",
  "24 HOURS",
  "7 DAYS",
  "1 MONTH",
  "3 MONTHS",
  "6 MONTHS",
  "12 MONTHS",
] as const;

const SEVERITY_OPTIONS = [
  "SERIOUS BREACH",
  "MODERATE BREACH",
  "MINOR BREACH",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

const MISSING_DATA_OPTIONS = ["skip", "fail", "warn"] as const;
const TRIGGER_OPERATORS = ["equals", "not_equals", "contains", "in"] as const;

type RuleBlock = {
  id: string;
  selectedSectionCode: string;
  actionApiNames: string[];
  defaultCategory: string;
  defaultTimescale: string;
  defaultSeverity: string;
  missingDataBehavior: string;
  ignoreValuesText: string;
  hasTrigger: boolean;
  triggerField: string;
  triggerOperator: string;
  triggerValue: string;
};

function makeBlock(overrides?: Partial<RuleBlock>): RuleBlock {
  return {
    id: Math.random().toString(36).slice(2),
    selectedSectionCode: "",
    actionApiNames: [],
    defaultCategory: "Maintenance: Fire Door Repair",
    defaultTimescale: "3 MONTHS",
    defaultSeverity: "SERIOUS BREACH",
    missingDataBehavior: "skip",
    ignoreValuesText: "1, , None",
    hasTrigger: false,
    triggerField: "",
    triggerOperator: "equals",
    triggerValue: "Yes",
    ...overrides,
  };
}

function RuleBlockCard({
  block,
  index,
  total,
  sections,
  onChange,
  onRemove,
}: {
  block: RuleBlock;
  index: number;
  total: number;
  sections: FormMetadataSection[];
  onChange: (patch: Partial<RuleBlock>) => void;
  onRemove: () => void;
}) {
  const currentSection = sections.find((s) => s.code === block.selectedSectionCode);
  const allFields = sections.flatMap((s) => s.fields);
  const availableActionFields =
    currentSection && currentSection.fields.length > 0
      ? currentSection.fields
      : allFields;

  const handleSectionChange = (code: string) => {
    onChange({ selectedSectionCode: code, actionApiNames: [] });
  };

  return (
    <SurfaceShell className="p-5 space-y-5 [border-radius:1px]">
      {/* Card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-md bg-blue-50 px-2.5 py-1 font-mono text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            c{index + 1}
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Rule Block {index + 1}
          </span>
        </div>
        {total > 1 && (
          <AppButton
            type="button"
            variant="ghost"
            onClick={onRemove}
            aria-label="Remove block"
            className="px-2 text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </AppButton>
        )}
      </div>

      {/* Section picker */}
      <div>
        <FieldLabel>Section</FieldLabel>
        {sections.length > 0 ? (
          <select
            value={block.selectedSectionCode}
            onChange={(e) => handleSectionChange(e.target.value)}
            className={surfaceSelectClassName}
          >
            <option value="">-- Select a section --</option>
            {sections.map((sec, idx) => (
              <option key={`${sec.code}-${idx}`} value={sec.code}>
                {sec.label}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-slate-500 italic">No sections available from metadata.</p>
        )}
      </div>

      {/* Action Fields */}
      <div>
        <FieldLabel>Action Fields ({block.actionApiNames.length} selected)</FieldLabel>
        <MultiCheckSelect
          options={availableActionFields.map((field) => ({
            value: field.api_name,
            label: `${field.label} (${field.api_name})`,
          }))}
          values={block.actionApiNames}
          onChange={(vals) => onChange({ actionApiNames: vals })}
          listLabel="Section Fields"
          placeholder="Select action fields..."
          searchPlaceholder="Search fields..."
          disabled={availableActionFields.length === 0}
        />
      </div>

      {/* Timescale / Severity / Missing Data */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel>Default Timescale</FieldLabel>
          <select
            value={block.defaultTimescale}
            onChange={(e) => onChange({ defaultTimescale: e.target.value })}
            className={surfaceSelectClassName}
          >
            {TIMESCALE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Default Severity</FieldLabel>
          <select
            value={block.defaultSeverity}
            onChange={(e) => onChange({ defaultSeverity: e.target.value })}
            className={surfaceSelectClassName}
          >
            {SEVERITY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Missing Data Behavior</FieldLabel>
          <select
            value={block.missingDataBehavior}
            onChange={(e) => onChange({ missingDataBehavior: e.target.value })}
            className={surfaceSelectClassName}
          >
            {MISSING_DATA_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      {/* Category */}
      <div>
        <FieldLabel>Default Category</FieldLabel>
        <input
          type="text"
          value={block.defaultCategory}
          onChange={(e) => onChange({ defaultCategory: e.target.value })}
          className={surfaceInputClassName}
        />
      </div>

      {/* Ignore Values */}
      <div>
        <FieldLabel>Ignore Values (comma-separated)</FieldLabel>
        <input
          type="text"
          value={block.ignoreValuesText}
          onChange={(e) => onChange({ ignoreValuesText: e.target.value })}
          placeholder="1, , None"
          className={`${surfaceInputClassName} font-mono`}
        />
      </div>

      {/* Trigger Condition */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={block.hasTrigger}
            onChange={(e) => onChange({ hasTrigger: e.target.checked })}
          />
          Add Trigger Condition (optional)
        </label>
        {block.hasTrigger && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel>Trigger Field</FieldLabel>
              {allFields.length > 0 ? (
                <select
                  value={block.triggerField}
                  onChange={(e) => onChange({ triggerField: e.target.value })}
                  className={surfaceSelectClassName}
                >
                  <option value="">-- Select field --</option>
                  {allFields.map((f, idx) => (
                    <option key={`${f.api_name}-${idx}`} value={f.api_name}>
                      {f.label} ({f.api_name})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={block.triggerField}
                  onChange={(e) => onChange({ triggerField: e.target.value })}
                  placeholder="field_api_name"
                  className={surfaceInputClassName}
                />
              )}
            </div>
            <div>
              <FieldLabel>Operator</FieldLabel>
              <select
                value={block.triggerOperator}
                onChange={(e) => onChange({ triggerOperator: e.target.value })}
                className={surfaceSelectClassName}
              >
                {TRIGGER_OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Value</FieldLabel>
              <input
                type="text"
                value={block.triggerValue}
                onChange={(e) => onChange({ triggerValue: e.target.value })}
                className={surfaceInputClassName}
              />
            </div>
          </div>
        )}
      </div>
    </SurfaceShell>
  );
}

export function RuleCreatePanel({ projectFormId }: { projectFormId: string }) {
  const router = useRouter();

  const [projectForms, setProjectForms] = React.useState<ProjectFormOption[]>([]);
  const [sections, setSections] = React.useState<FormMetadataSection[]>([]);
  const [loadingMetadata, setLoadingMetadata] = React.useState(false);
  const [blocks, setBlocks] = React.useState<RuleBlock[]>([makeBlock()]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void fetchProjectFormOptions().then(setProjectForms).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!projectFormId) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoadingMetadata(true);
        setError(null);
        const meta = await fetchProjectFormMetadata(projectFormId);
        if (!cancelled) {
          setSections(meta);
          // Auto-select first section for the initial block
          if (meta.length > 0) {
            setBlocks([makeBlock({ selectedSectionCode: meta[0].code })]);
          }
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load form metadata.");
      } finally {
        if (!cancelled) setLoadingMetadata(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectFormId]);

  const updateBlock = (index: number, patch: Partial<RuleBlock>) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const addBlock = () => {
    const nextSection = sections[blocks.length % sections.length];
    setBlocks((prev) => [
      ...prev,
      makeBlock({ selectedSectionCode: nextSection?.code ?? "" }),
    ]);
  };

  const selectedFormName = projectForms.find((f) => String(f.id) === projectFormId)?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.actionApiNames.length === 0) {
        setError(`Block ${i + 1}: please select at least one action field.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      // Find section info from metadata
      await Promise.all(
        blocks.map((block, index) => {
          const sec = sections.find((s) => s.code === block.selectedSectionCode);
          return createFormRenderRule({
            project_form: Number(projectFormId),
            dynamic_form: null,
            section_code: `c${index + 1}`,
            section_label: sec?.label ?? block.selectedSectionCode,
            display_order: index + 1,
            action_api_names: block.actionApiNames,
            trigger_condition:
              block.hasTrigger && block.triggerField.trim()
                ? { field: block.triggerField.trim(), operator: block.triggerOperator, value: block.triggerValue }
                : null,
            missing_data_behavior: block.missingDataBehavior,
            default_category: block.defaultCategory.trim(),
            default_timescale: block.defaultTimescale,
            default_severity: block.defaultSeverity,
            action_delimiter: ":",
            ignore_values: block.ignoreValuesText.split(",").map((v) => v.trim()),
          });
        }),
      );

      router.push(routes.dashboard.settingsRulesDetail(projectFormId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rules.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AppButton
          type="button"
          variant="ghost"
          onClick={() => router.push(routes.dashboard.settingsRules)}
          aria-label="Back to rules"
          className="px-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </AppButton>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Create Render Rules
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Form: {selectedFormName ?? `#${projectFormId}`}
            {loadingMetadata && " · Loading metadata..."}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rule blocks */}
        {blocks.map((block, index) => (
          <RuleBlockCard
            key={block.id}
            block={block}
            index={index}
            total={blocks.length}
            sections={sections}
            onChange={(patch) => updateBlock(index, patch)}
            onRemove={() => removeBlock(index)}
          />
        ))}

        {/* Add Block */}
        <button
          type="button"
          onClick={addBlock}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:text-blue-400"
        >
          <Plus className="h-4 w-4" />
          Add Block
        </button>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => router.push(routes.dashboard.settingsRules)}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={submitting}>
            {submitting
              ? "Creating..."
              : blocks.length > 1
              ? `Create ${blocks.length} Rules`
              : "Create Rule"}
          </AppButton>
        </div>
      </form>
    </div>
  );
}
