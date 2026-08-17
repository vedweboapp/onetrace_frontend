"use client";

import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { AppButton } from "@/shared/ui/app-button";
import { FormRule, RuleCondition, FormRuleOutput, RuleAction } from "./form-rules.types";
import { RuleFieldSelect, type RuleFieldOption } from "./rule-field-select";
import MultiSelect from "../components/multi-select";
import { PhoneNumberInput, DEFAULT_PHONE_COUNTRY, surfaceInputClassName } from "@/shared/ui";
import { currencyList } from "../components/currency-list";

/** Full-height drawer below the form builder sub-header (top-14 + h-14 = 7rem). */
const FORM_BUILDER_SUBHEADER_OFFSET = "top-28";
const FORM_BUILDER_DRAWER_HEIGHT = "h-[calc(100dvh-7rem)]";

type FormRuleModalProps = {
  onClose: () => void;
  onSave: (rule: FormRule) => void;
  fields: RuleFieldOption[];
  initialRule?: FormRule | null;
  existingRules?: FormRule[];
};

interface CONDITION_TYPES {
  label: string;
  value: RuleCondition;
}

const conditionTypes: CONDITION_TYPES[] = [
  { label: "Is", value: "is" },
  { label: "Is Not", value: "is_not" },
  { label: "Is Empty", value: "is_empty" },
  { label: "Is Not Empty", value: "is_not_empty" },
  { label: "Ends With", value: "ends_with" },
  { label: "Is Any One Of", value: "is_any_one_of" },
  { label: "Is None Of", value: "is_none_of" },
];

const actionTypes: { label: string; value: RuleAction }[] = [
  { label: "Show", value: "show" },
  { label: "Hide", value: "hide" },
  { label: "Require", value: "require" },
  { label: "Disable", value: "disable" },
];

const FormRuleModal = ({ onClose, onSave, fields, initialRule, existingRules = [] }: FormRuleModalProps) => {
  const [name, setName] = useState(initialRule?.name || "");
  const [triggerField, setTriggerField] = useState(initialRule?.field_api_name || "");
  const [condition, setCondition] = useState<RuleCondition | "">(initialRule?.condition || "");
  const [ruleValue, setRuleValue] = useState(
    Array.isArray(initialRule?.value) ? initialRule.value.join(", ") : (initialRule?.value || "")
  );

  const [outputs, setOutputs] = useState<FormRuleOutput[]>(
    initialRule?.output_fields?.length
      ? initialRule.output_fields
      : [{ field_api_name: "", action: "show" }]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const claimedByOtherRules = React.useMemo(() => {
    const claimed = new Set<string>();
    existingRules.forEach(r => {
      if (r._uid !== initialRule?._uid) {
        if (r.rule_type === "advanced" && r.blocks) {
          r.blocks.forEach(b => {
            b.output_fields?.forEach(o => claimed.add(o.field_api_name));
          });
        } else {
          r.output_fields?.forEach(o => claimed.add(o.field_api_name));
        }
      }
    });
    return claimed;
  }, [existingRules, initialRule]);

  const triggerFieldsUsedInOtherRules = React.useMemo(() => {
    const usedTriggers = new Set<string>();
    existingRules.forEach(r => {
      if (r._uid !== initialRule?._uid) {
        if (r.rule_type === "advanced" && r.blocks) {
          r.blocks.forEach(b => {
            if (b.field_api_name) usedTriggers.add(b.field_api_name);
          });
        } else {
          if (r.field_api_name) usedTriggers.add(r.field_api_name);
        }
      }
    });
    return usedTriggers;
  }, [existingRules, initialRule]);

  const selectedOutputFieldNames = React.useMemo(() => {
    return new Set(outputs.map((o) => o.field_api_name).filter(Boolean));
  }, [outputs]);

  const triggerFieldOptions = React.useMemo(() => {
    return fields.filter(
      (field) => {
        if (field.optionKind === "section") return false;
        if (selectedOutputFieldNames.has(field.value)) return false;
        const typeLower = (field.type || "").toLowerCase();
        return (
          typeLower !== "image_upload" &&
          typeLower !== "imageupload" &&
          typeLower !== "image" &&
          typeLower !== "multi_image_upload" &&
          typeLower !== "multi_image" &&
          typeLower !== "multiple_images" &&
          typeLower !== "file_upload" &&
          typeLower !== "fileupload" &&
          typeLower !== "file" &&
          typeLower !== "signature"
        );
      }
    );
  }, [fields, selectedOutputFieldNames]);

  const handleAddOutput = () => {
    setOutputs([...outputs, { field_api_name: "", action: "show" }]);
  };

  const handleRemoveOutput = (index: number) => {
    if (outputs.length > 1) {
      setOutputs(outputs.filter((_, i) => i !== index));
    }
  };

  const handleOutputChange = (
    index: number,
    field: keyof FormRuleOutput,
    value: FormRuleOutput[keyof FormRuleOutput],
  ) => {
    const newOutputs = [...outputs];
    if (field === "field_api_name" && typeof value === "string") {
      const option = fields.find((f) => f.value === value);
      newOutputs[index] = {
        ...newOutputs[index],
        field_api_name: value,
        target_type: option?.targetType || (option?.optionKind === "section" ? "section" : "field"),
        field_id: option?.fieldId || null,
        field_uid: option?.fieldUid || option?.u_id,
        section_id: option?.sectionId || option?.s_id || null,
        section_uid: option?.sectionUid,
        s_id: option?.s_id ?? option?.sectionId ?? option?.sectionUid,
        u_id: option?.u_id ?? option?.fieldUid,
      };
    } else {
      newOutputs[index] = { ...newOutputs[index], [field]: value };
    }
    setOutputs(newOutputs);
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Rule name is required";
    if (name.length > 20) newErrors.name = "Maximum 20 characters";
    if (!triggerField) newErrors.triggerField = "Trigger field is required";
    if (!condition) newErrors.condition = "Condition is required";

    if (condition !== "is_empty" && condition !== "is_not_empty" && !ruleValue) {
      newErrors.ruleValue = "Value is required";
    }

    const validOutputs = outputs.filter(o => o.field_api_name && o.action);
    if (validOutputs.length === 0) {
      newErrors.outputs = "At least one target field is required";
    }
    if (triggerField && validOutputs.some((o) => o.field_api_name === triggerField)) {
      newErrors.outputs = "Target field cannot be the same as trigger field";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let formattedValue: string | string[] | null = ruleValue;
    if (condition === "is_any_one_of" || condition === "is_none_of") {
      formattedValue = String(ruleValue).split(",").map(s => s.trim()).filter(Boolean);
    } else if (condition === "is_empty" || condition === "is_not_empty") {
      formattedValue = null;
    }

    const selectedTriggerOption = fields.find((f) => f.value === triggerField);
    const enrichedOutputs = validOutputs.map((o) => {
      const option = fields.find((f) => f.value === o.field_api_name);
      return {
        ...o,
        target_type: o.target_type || option?.targetType || (option?.optionKind === "section" ? "section" : "field"),
        field_id: o.field_id ?? option?.fieldId ?? null,
        field_uid: o.field_uid ?? option?.fieldUid ?? option?.u_id,
        section_id: o.section_id ?? option?.sectionId ?? option?.s_id ?? null,
        section_uid: o.section_uid ?? option?.sectionUid,
        s_id: o.s_id ?? option?.s_id ?? option?.sectionId ?? option?.sectionUid,
        u_id: o.u_id ?? option?.u_id ?? option?.fieldUid,
      };
    });

    const rule: FormRule = {
      _uid: initialRule?._uid || `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      id: initialRule?.id,
      name,
      sequence: initialRule?.sequence || 0,
      field_api_name: triggerField,
      field_id: selectedTriggerOption?.fieldId ?? null,
      field_uid: selectedTriggerOption?.fieldUid ?? selectedTriggerOption?.u_id,
      s_id: selectedTriggerOption?.s_id ?? selectedTriggerOption?.sectionId ?? selectedTriggerOption?.sectionUid,
      u_id: selectedTriggerOption?.u_id ?? selectedTriggerOption?.fieldUid,
      condition: condition as RuleCondition,
      value: formattedValue,
      output_fields: enrichedOutputs,
    };

    onSave(rule);
  };

  const isValueDisabled = condition === "is_empty" || condition === "is_not_empty";
  const selectedField = fields.find((f) => f.value === triggerField);

  const renderValueInput = () => {
    if (isValueDisabled) {
      return (
        <input
          type="text"
          className={`${surfaceInputClassName}`}
          disabled
          value=""
        />
      );
    }

    const fieldType = selectedField?.type;

    if (fieldType === "date") {
      return (
        <input
          type="date"
          className={`w-full p-2.5 border outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] ${errors.ruleValue ? 'border-red-500' : 'border-gray-300'} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md outline-none`}
          value={ruleValue}
          onChange={(e) => setRuleValue(e.target.value)}
        />
      );
    }

    if (fieldType === "datetime") {
      return (
        <input
          type="datetime-local"
          className={`w-full outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] p-2.5 border ${errors.ruleValue ? 'border-red-500' : 'border-gray-300'} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md outline-none`}
          value={ruleValue}
          onChange={(e) => setRuleValue(e.target.value)}
        />
      );
    }

    if (fieldType === "phone" || fieldType === "mobile") {
      return (
        <div className="surface-phone-root w-full mt-1.5">
          <PhoneNumberInput
            value={ruleValue}
            onChange={setRuleValue}
            defaultCountry={DEFAULT_PHONE_COUNTRY}
            placeholder="Enter phone number"
            className="w-full"
            numberInputProps={{
              className: `w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors.ruleValue ? "border-red-500" : "border-gray-300"} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md outline-none`,
            }}
          />
        </div>
      );
    }

    if (fieldType === "checkbox") {
      return (
        <select
          className={`w-full p-2.5 border outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] ${errors.ruleValue ? 'border-red-500' : 'border-gray-300'} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
          value={ruleValue}
          onChange={(e) => setRuleValue(e.target.value)}
        >
          <option value="">Select Option</option>
          <option value="true">True (Checked)</option>
          <option value="false">False (Unchecked)</option>
        </select>
      );
    }

    if (fieldType === "currency") {
      return (
        <select
          className={`w-full p-2.5 border outline-none focus:ring-[color:var(--dash-accent)] ${errors.ruleValue ? 'border-red-500' : 'border-gray-300'} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
          value={ruleValue}
          onChange={(e) => setRuleValue(e.target.value)}
        >
          <option value="">Select Currency</option>
          {currencyList.map((currency) => (
            <option key={`${currency.countryCode}-${currency.value}`} value={currency.value}>
              {currency.label} - {currency.value}
            </option>
          ))}
        </select>
      );
    }

    if (fieldType === "picklist" || fieldType === "multi_select" || fieldType === "radio") {
      const isMulti = condition === "is_any_one_of" || condition === "is_none_of";
      const fieldOptions = selectedField?.options || [];

      if (isMulti) {
        const parsedValues = ruleValue
          ? ruleValue.split(",").map(s => s.trim()).filter(Boolean)
          : [];
        return (
          <div className="w-full">
            <MultiSelect
              name="rule-value-multi"
              options={fieldOptions}
              value={parsedValues}
              onChange={(newVal) => setRuleValue(newVal.join(", "))}
              placeholder="Select options..."
            />
          </div>
        );
      } else {
        return (
          <select
            className={`w-full p-2.5 border ${errors.ruleValue ? 'border-red-500' : 'border-gray-300'} outline-none focus:ring-[color:var(--dash-accent)] rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
            value={ruleValue}
            onChange={(e) => setRuleValue(e.target.value)}
          >
            <option value="">Select Option</option>
            {fieldOptions.map((opt) => {
              const optionValue = typeof opt === "string" ? opt : opt.value;
              const optionLabel = typeof opt === "string" ? opt : opt.label;
              return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
              );
            })}
          </select>
        );
      }
    }
    return (
      <input
        type="text"
        placeholder={condition === "is_any_one_of" || condition === "is_none_of" ? "comma, separated, values" : "Enter value"}
        className={`w-full p-2.5 border ${errors.ruleValue ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[color:var(--dash-accent)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md outline-none`}
        value={ruleValue}
        onChange={(e) => setRuleValue(e.target.value)}
      />
    );
  };

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-[25] bg-slate-950/30 ${FORM_BUILDER_SUBHEADER_OFFSET}`}
        aria-label="Close rule panel"
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 z-[30] flex w-full max-w-5xl flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:w-[45%] ${FORM_BUILDER_SUBHEADER_OFFSET} ${FORM_BUILDER_DRAWER_HEIGHT}`}
        role="dialog"
        aria-modal="true"
        aria-label="Form rule"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {initialRule ? "Edit rule" : "Add rule"}
          </span>
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            className="size-9 p-0"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </AppButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-2 border-b border-gray-200 dark:border-slate-700 pb-4 border-dotted">
            <label htmlFor="rule-name" className="text-sm font-medium text-slate-900 dark:text-slate-100">Rule Name</label>
            <input
              type="text"
              id="rule-name"
              className={`w-full p-2 border focus:ring-2 outline-none focus:ring-[color:var(--dash-accent)] ${errors.name ? 'border-red-500' : 'border-gray-200'} rounded-md dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700`}
              placeholder="Enter Rule name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
            <div className="flex justify-between items-center">
              {errors.name ? (
                <span className="text-red-500 text-sm">{errors.name}</span>
              ) : (
                <span className="text-slate-500 text-sm">(Maximum 20 characters)</span>
              )}
            </div>
          </div>

          <div className="flex gap-4 py-6">
            {/* Left Labels */}
            <div className="flex flex-col items-center">
              <div className="bg-slate-600 text-white text-sm px-6 py-2 rounded">
                If
              </div>
              <div className="w-px h-20 bg-gray-300 dark:bg-slate-700" />
              <div className="bg-slate-600 text-white text-sm px-4 py-2 rounded">
                Then
              </div>
            </div>

            {/* Right Content */}
            <div className="flex flex-col gap-6 w-full py-2">

              {/* IF SECTION */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-3 items-center">
                  <RuleFieldSelect
                    className="w-64"
                    value={triggerField}
                    onChange={setTriggerField}
                    options={triggerFieldOptions}
                    placeholder="Select Field"
                    invalid={!!errors.triggerField}
                    listLabel="Trigger fields"
                  />

                  <select
                    className={`w-52 p-2.5 border outline-none ${errors.condition ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[color:var(--dash-accent)] rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as RuleCondition)}
                  >
                    <option value="">Select Condition</option>
                    {conditionTypes.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {renderValueInput()}
                </div>
                {(errors.triggerField || errors.condition || errors.ruleValue) && (
                  <span className="text-red-500 text-sm">Please complete the &quot;If&quot; condition fields</span>
                )}
              </div>

              {/* THEN SECTION */}
              <div className="flex flex-col gap-4 mt-2">
                <span className="text-gray-700 text-sm font-medium dark:text-slate-200">
                  Perform the following actions
                </span>

                <div className="flex flex-col gap-3">
                  {outputs.map((output, idx) => {
                    const availableFields = fields.filter(f =>
                      f.value !== triggerField &&
                      !claimedByOtherRules.has(f.value) &&
                      !triggerFieldsUsedInOtherRules.has(f.value)
                    );

                    return (
                      <div key={idx} className="flex gap-3 items-center">
                        <select
                          className="w-52 p-2.5 border outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border-gray-300 rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                          value={output.action}
                          onChange={(e) => handleOutputChange(idx, "action", e.target.value)}
                        >
                          {actionTypes.map(action => (
                            <option key={action.value} value={action.value}>{action.label}</option>
                          ))}
                        </select>

                        <RuleFieldSelect
                          className="w-full"
                          value={output.field_api_name}
                          onChange={(value) => handleOutputChange(idx, "field_api_name", value)}
                          options={availableFields}
                          placeholder="Select Target Field"
                          invalid={!output.field_api_name && !!errors.outputs}
                          listLabel="Target fields and sections"
                        />

                        <AppButton
                          type="button"
                          variant="ghost"
                          className={`text-red-500 p-2 hover:bg-red-50 hover:text-red-600  dark:hover:bg-red-950/30 ${outputs.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => handleRemoveOutput(idx)}
                          disabled={outputs.length === 1}
                          aria-label="Remove action"
                        >
                          <Trash2 className="size-4" />
                        </AppButton>
                      </div>
                    )
                  })}

                  <button
                    type="button"
                    className="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1 w-max mt-1 hover:underline"
                    onClick={handleAddOutput}
                  >
                    <Plus className="size-4" /> Add action
                  </button>
                  {errors.outputs && <span className="text-red-500 text-sm">{errors.outputs}</span>}
                </div>
              </div>

            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <AppButton variant="secondary" size="md" onClick={onClose}>Cancel</AppButton>
          <AppButton size="md" onClick={handleSave}>Save</AppButton>
        </div>
      </aside>
    </>
  );
};

export default FormRuleModal;
