"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import type { FormMetadataSection } from "@/features/rules/api/rule.api";
import {
  EXCLUDED_TRIGGER_FIELD_TYPES,
  MISSING_DATA_OPTIONS,
  SEVERITY_OPTIONS,
  TIMESCALE_OPTIONS,
  TRIGGER_OPERATORS,
} from "@/features/rules/constants/rule-form.constants";
import {
  AppButton,
  FieldLabel,
  MultiCheckSelect,
  SurfaceShell,
  surfaceInputClassName,
  surfaceSelectClassName,
} from "@/shared/ui";

export type RuleBlock = {
  id: string;
  ruleId?: number;
  selectedSectionCode: string;
  sectionLabelFallback?: string;
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

export function makeBlock(overrides?: Partial<RuleBlock>): RuleBlock {
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
    triggerValue: "",
    ...overrides,
  };
}

export function RuleBlockCard({
  block,
  index,
  total,
  sections,
  usedSectionCodes,
  onChange,
  onRemove,
}: {
  block: RuleBlock;
  index: number;
  total: number;
  sections: FormMetadataSection[];
  usedSectionCodes: Set<string>;
  onChange: (patch: Partial<RuleBlock>) => void;
  onRemove: () => void;
}) {
  const availableSections = React.useMemo(() => {
    const filtered = sections.filter(
      (s) => s.code === block.selectedSectionCode || !usedSectionCodes.has(s.code),
    );
    if (
      block.selectedSectionCode &&
      !filtered.some((s) => s.code === block.selectedSectionCode)
    ) {
      return [
        {
          id: block.selectedSectionCode,
          code: block.selectedSectionCode,
          label: block.sectionLabelFallback ?? block.selectedSectionCode,
          fields: [],
        },
        ...filtered,
      ];
    }
    return filtered;
  }, [sections, block.selectedSectionCode, block.sectionLabelFallback, usedSectionCodes]);

  const currentSection = sections.find((s) => s.code === block.selectedSectionCode);
  const allFields = React.useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  const triggerableFields = React.useMemo(
    () => allFields.filter((f) => !EXCLUDED_TRIGGER_FIELD_TYPES.has(f.field_type)),
    [allFields],
  );
  const selectedTriggerField = triggerableFields.find(
    (f) => f.api_name === block.triggerField,
  );
  const availableActionFields =
    currentSection && currentSection.fields.length > 0
      ? currentSection.fields
      : allFields;

  const actionOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const field of availableActionFields) {
      map.set(field.api_name, `${field.label} (${field.api_name})`);
    }
    for (const name of block.actionApiNames) {
      if (!map.has(name)) {
        map.set(name, name);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [availableActionFields, block.actionApiNames]);

  const handleTriggerFieldChange = (apiName: string) => {
    const field = triggerableFields.find((f) => f.api_name === apiName);
    let nextValue = "";
    if (field?.options && field.options.length > 0) {
      nextValue = field.options[0];
    } else if (field?.field_type === "checkbox") {
      nextValue = "true";
    }
    onChange({ triggerField: apiName, triggerValue: nextValue });
  };

  const handleSectionChange = (code: string) => {
    onChange({ selectedSectionCode: code, actionApiNames: [] });
  };

  return (
    <SurfaceShell className="p-5 space-y-5 rounded-sm">
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

      {/* Section + Action Fields — side by side on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Section picker */}
        <div>
          <FieldLabel>Section</FieldLabel>
          {availableSections.length > 0 ? (
            <select
              value={block.selectedSectionCode}
              onChange={(e) => handleSectionChange(e.target.value)}
              className={surfaceSelectClassName}
            >
              <option value="">-- Select a section --</option>
              {availableSections.map((sec, idx) => (
                <option key={`${sec.code}-${idx}`} value={sec.code}>
                  {sec.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-slate-500 italic">No unused sections available.</p>
          )}
        </div>

        {/* Action Fields */}
        <div>
          <FieldLabel>Action Fields ({block.actionApiNames.length} selected)</FieldLabel>
          <MultiCheckSelect
            options={actionOptions}
            values={block.actionApiNames}
            onChange={(vals) => onChange({ actionApiNames: vals })}
            listLabel="Section Fields"
            placeholder="Select action fields..."
            searchPlaceholder="Search fields..."
            disabled={actionOptions.length === 0}
          />
        </div>
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
            {TIMESCALE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Default Severity</FieldLabel>
          <select
            value={block.defaultSeverity}
            onChange={(e) => onChange({ defaultSeverity: e.target.value })}
            className={surfaceSelectClassName}
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Missing Data Behavior</FieldLabel>
          <select
            value={block.missingDataBehavior}
            onChange={(e) => onChange({ missingDataBehavior: e.target.value })}
            className={surfaceSelectClassName}
          >
            {MISSING_DATA_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category + Ignore Values */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <FieldLabel>Default Category</FieldLabel>
          <input
            type="text"
            value={block.defaultCategory}
            onChange={(e) => onChange({ defaultCategory: e.target.value })}
            className={surfaceInputClassName}
          />
        </div>

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
      </div>

      {/* Trigger Condition */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={block.hasTrigger}
            onChange={(e) => {
              const checked = e.target.checked;
              onChange(
                checked
                  ? { hasTrigger: true }
                  : {
                      hasTrigger: false,
                      triggerField: "",
                      triggerOperator: "equals",
                      triggerValue: "",
                    },
              );
            }}
          />
          Add Trigger Condition (optional)
        </label>
        {block.hasTrigger && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel>Trigger Field</FieldLabel>
              {triggerableFields.length > 0 ? (
                <select
                  value={block.triggerField}
                  onChange={(e) => handleTriggerFieldChange(e.target.value)}
                  className={surfaceSelectClassName}
                >
                  <option value="">-- Select field --</option>
                  {triggerableFields.map((f, idx) => (
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
                {TRIGGER_OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Value</FieldLabel>
              {selectedTriggerField && selectedTriggerField.options.length > 0 ? (
                <select
                  value={block.triggerValue}
                  onChange={(e) => onChange({ triggerValue: e.target.value })}
                  className={surfaceSelectClassName}
                >
                  <option value="">-- Select value --</option>
                  {selectedTriggerField.options.map((opt, idx) => (
                    <option key={`${opt}-${idx}`} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : selectedTriggerField?.field_type === "checkbox" ? (
                <select
                  value={block.triggerValue}
                  onChange={(e) => onChange({ triggerValue: e.target.value })}
                  className={surfaceSelectClassName}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : selectedTriggerField?.field_type === "date" ? (
                <input
                  type="date"
                  value={block.triggerValue}
                  onChange={(e) => onChange({ triggerValue: e.target.value })}
                  className={surfaceInputClassName}
                />
              ) : selectedTriggerField?.field_type === "datetime" ? (
                <input
                  type="datetime-local"
                  value={block.triggerValue}
                  onChange={(e) => onChange({ triggerValue: e.target.value })}
                  className={surfaceInputClassName}
                />
              ) : selectedTriggerField &&
                ["number", "decimal", "currency", "percent"].includes(
                  selectedTriggerField.field_type,
                ) ? (
                <input
                  type="number"
                  value={block.triggerValue}
                  onChange={(e) => onChange({ triggerValue: e.target.value })}
                  className={surfaceInputClassName}
                />
              ) : (
                <input
                  type="text"
                  value={block.triggerValue}
                  onChange={(e) => onChange({ triggerValue: e.target.value })}
                  className={surfaceInputClassName}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </SurfaceShell>
  );
}
