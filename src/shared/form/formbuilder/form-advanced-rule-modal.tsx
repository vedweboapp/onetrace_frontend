"use client";

import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { AppButton } from "@/shared/ui/app-button";
import { FormRule, RuleCondition, FormRuleOutput, RuleAction, FormRuleBlock } from "./form-rules.types";
import MultiSelect from "../components/multi-select";
import { PhoneNumberInput, DEFAULT_PHONE_COUNTRY } from "@/shared/ui";
import { currencyList } from "../components/currency-list";

const FORM_BUILDER_SUBHEADER_OFFSET = "top-28";
const FORM_BUILDER_DRAWER_HEIGHT = "h-[calc(100dvh-7rem)]";

type FormAdvancedRuleModalProps = {
  onClose: () => void;
  onSave: (rule: FormRule) => void;
  fields: { value: string; label: string; type?: string; options?: any[] }[];
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

const createEmptyBlock = (): FormRuleBlock => ({
  _uid: `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  field_api_name: "",
  condition: "is",
  value: "",
  output_fields: [{ field_api_name: "", action: "show" }],
  // else_output_fields is undefined by default (user must explicitly add Else)
});

const FormAdvancedRuleModal = ({
  onClose,
  onSave,
  fields,
  initialRule,
  existingRules = [],
}: FormAdvancedRuleModalProps) => {
  const [name, setName] = useState(initialRule?.name || "");
  const [blocks, setBlocks] = useState<FormRuleBlock[]>(
    initialRule?.blocks && initialRule.blocks.length > 0
      ? initialRule.blocks.map(b => ({
          ...b,
          _uid: b._uid || `block-${Date.now()}-${Math.random()}`,
          output_fields: b.output_fields?.length
            ? b.output_fields
            : [{ field_api_name: "", action: "show" }],
          else_output_fields: b.else_output_fields?.length
            ? b.else_output_fields
            : undefined,
        }))
      : [createEmptyBlock()]
  );

  // Track which blocks have the Else section expanded
  const [showElseBlocks, setShowElseBlocks] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (initialRule?.blocks) {
      initialRule.blocks.forEach(b => {
        if (b.else_output_fields && b.else_output_fields.length > 0) {
          set.add(b._uid);
        }
      });
    }
    return set;
  });

  const toggleElseSection = (blockUid: string, blockIdx: number, show: boolean) => {
    setShowElseBlocks(prev => {
      const next = new Set(prev);
      if (show) {
        next.add(blockUid);
        // Initialise else fields pre-filled from the IF block
        setBlocks(bs =>
          bs.map((b, i) =>
            i === blockIdx && !b.else_output_fields?.length
              ? {
                  ...b,
                  else_condition: undefined,
                  else_value: undefined,
                  else_output_fields: [{ field_api_name: "", action: "show" }],
                }
              : b
          )
        );
      } else {
        next.delete(blockUid);
        // Clear else fields when hidden
        setBlocks(bs =>
          bs.map((b, i) =>
            i === blockIdx
              ? { ...b, else_condition: undefined, else_value: undefined, else_output_fields: undefined }
              : b
          )
        );
      }
      return next;
    });
  };
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allUsedIfFields = React.useMemo(() => {
    return new Set(blocks.map(b => b.field_api_name).filter(Boolean));
  }, [blocks]);

  const allUsedThenFields = React.useMemo(() => {
    return new Set(blocks.flatMap(b => b.output_fields.map(o => o.field_api_name)).filter(Boolean));
  }, [blocks]);

  const getAvailableIfFields = (blockIdx: number) => {
    return fields.filter((field) => {
      const typeLower = (field.type || "").toLowerCase();
      if (
        typeLower === "image_upload" ||
        typeLower === "imageupload" ||
        typeLower === "image" ||
        typeLower === "file_upload" ||
        typeLower === "fileupload" ||
        typeLower === "file" ||
        typeLower === "signature"
      ) {
        return false;
      }
      
      const isUsedByOtherIf = blocks.some((b, i) => i !== blockIdx && b.field_api_name === field.value);
      // Disallowed in IF if it is targeted by a THEN action in the current block or any future blocks
      const isUsedByFutureOrCurrentThen = blocks.some((b, i) => {
        if (i < blockIdx) return false;
        const inThen = b.output_fields.some(o => o.field_api_name === field.value);
        const inElse = (b.else_output_fields || []).some(o => o.field_api_name === field.value);
        return inThen || inElse;
      });

      return !isUsedByOtherIf && !isUsedByFutureOrCurrentThen;
    });
  };

  const getAvailableThenFields = (blockIdx: number, outputIdx: number, isElse = false) => {
    const block = blocks[blockIdx];
    return fields.filter((field) => {
      // Exclude if used as an IF trigger in current or previous blocks (index <= blockIdx)
      const isUsedInCurrentOrPrevIf = blocks.some((b, i) => {
        if (i > blockIdx) return false;
        return b.field_api_name === field.value;
      });
      if (isUsedInCurrentOrPrevIf) return false;

      // Exclude fields used in the current block's other output rows (Then)
      const isUsedByOtherThenOutput = block.output_fields.some((o, i) => {
        return !isElse && i !== outputIdx && o.field_api_name === field.value;
      });
      if (isUsedByOtherThenOutput) return false;

      // Exclude fields used in the current block's other Else rows
      const isUsedByOtherElseOutput = (block.else_output_fields || []).some((o, i) => {
        return isElse && i !== outputIdx && o.field_api_name === field.value;
      });
      if (isUsedByOtherElseOutput) return false;

      return true;
    });
  };

  const handleAddBlock = () => {
    setBlocks([...blocks, createEmptyBlock()]);
  };

  const handleRemoveBlock = (idx: number) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter((_, i) => i !== idx));
    }
  };

  const handleBlockChange = (idx: number, updatedFields: Partial<FormRuleBlock>) => {
    setBlocks(
      blocks.map((block, i) => (i === idx ? { ...block, ...updatedFields } : block))
    );
  };

  const handleAddOutput = (blockIdx: number, isElse = false) => {
    const block = blocks[blockIdx];
    const key = isElse ? "else_output_fields" : "output_fields";
    const currentList = (block[key] as FormRuleOutput[]) || [];
    handleBlockChange(blockIdx, { [key]: [...currentList, { field_api_name: "", action: "show" as RuleAction }] });
  };

  const handleRemoveOutput = (blockIdx: number, outputIdx: number, isElse = false) => {
    const block = blocks[blockIdx];
    const key = isElse ? "else_output_fields" : "output_fields";
    const currentList = (block[key] as FormRuleOutput[]) || [];
    if (currentList.length > 1) {
      handleBlockChange(blockIdx, { [key]: currentList.filter((_, i) => i !== outputIdx) });
    }
  };

  const handleOutputChange = (
    blockIdx: number,
    outputIdx: number,
    field: keyof FormRuleOutput,
    value: any,
    isElse = false
  ) => {
    const block = blocks[blockIdx];
    const key = isElse ? "else_output_fields" : "output_fields";
    const currentList = (block[key] as FormRuleOutput[]) || [];
    const updatedOutputs = currentList.map((output, i) =>
      i === outputIdx ? { ...output, [field]: value } : output
    );
    handleBlockChange(blockIdx, { [key]: updatedOutputs });
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Rule name is required";
    if (name.length > 20) newErrors.name = "Maximum 20 characters";

    const usedIfFields = new Set<string>();

    blocks.forEach((block, idx) => {
      const usedThenFieldsInBlock = new Set<string>();

      if (!block.field_api_name) {
        newErrors[`block-${idx}-triggerField`] = "Trigger field is required";
      } else {
        if (usedIfFields.has(block.field_api_name)) {
          newErrors[`block-${idx}-triggerField`] = "Each field can only be used as a trigger once";
        } else {
          // Cannot be used as trigger if targeted by THEN in current or future blocks
          const isUsedInCurrentOrFutureThen = blocks.some((b, i) => {
            if (i < idx) return false;
            const inThen = b.output_fields.some(o => o.field_api_name === block.field_api_name);
            const inElse = (b.else_output_fields || []).some(o => o.field_api_name === block.field_api_name);
            return inThen || inElse;
          });
          if (isUsedInCurrentOrFutureThen) {
            newErrors[`block-${idx}-triggerField`] = "Field cannot be used as trigger if it is targeted by current/future actions";
          } else {
            usedIfFields.add(block.field_api_name);
          }
        }
      }

      if (!block.condition) {
        newErrors[`block-${idx}-condition`] = "Condition is required";
      }
      if (
        block.condition !== "is_empty" &&
        block.condition !== "is_not_empty" &&
        !block.value
      ) {
        newErrors[`block-${idx}-ruleValue`] = "Value is required";
      }

      const validOutputs = block.output_fields.filter((o) => o.field_api_name && o.action);
      if (validOutputs.length === 0) {
        newErrors[`block-${idx}-outputs`] = "At least one target field is required";
      }
      
      block.output_fields.forEach((o) => {
        if (o.field_api_name) {
          if (usedThenFieldsInBlock.has(o.field_api_name)) {
            newErrors[`block-${idx}-outputs`] = "Each field can only be targeted by a action once within the same rule block";
          } else {
            // Cannot be targeted by THEN if it is used as trigger in current/preceding blocks
            const isUsedInCurrentOrPrevIf = blocks.some((b, i) => {
              if (i > idx) return false;
              return b.field_api_name === o.field_api_name;
            });
            if (isUsedInCurrentOrPrevIf) {
              newErrors[`block-${idx}-outputs`] = "Field cannot be targeted if used as a trigger in a previous or current block";
            } else {
              usedThenFieldsInBlock.add(o.field_api_name);
            }
          }
        }
      });

      if (block.field_api_name && validOutputs.some((o) => o.field_api_name === block.field_api_name)) {
        newErrors[`block-${idx}-outputs`] = "Target field cannot be the same as trigger field";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formattedBlocks = blocks.map((block) => {
      let formattedValue: string | string[] | null = Array.isArray(block.value)
        ? block.value.join(", ")
        : block.value;

      if (block.condition === "is_any_one_of" || block.condition === "is_none_of") {
        formattedValue = String(block.value).split(",").map((s) => s.trim()).filter(Boolean);
      } else if (block.condition === "is_empty" || block.condition === "is_not_empty") {
        formattedValue = null;
      }

      let formattedElseValue: string | string[] | null | undefined = undefined;
      if (block.else_output_fields && block.else_output_fields.length > 0 && block.else_condition) {
        const elseCond = block.else_condition;
        const elseVal = block.else_value;
        if (elseCond === "is_any_one_of" || elseCond === "is_none_of") {
          formattedElseValue = elseVal ? String(elseVal).split(",").map((s) => s.trim()).filter(Boolean) : [];
        } else if (elseCond === "is_empty" || elseCond === "is_not_empty") {
          formattedElseValue = null;
        } else {
          formattedElseValue = Array.isArray(elseVal) ? elseVal.join(", ") : (elseVal ?? null);
        }
      }

      return {
        ...block,
        value: formattedValue,
        else_condition: (block.else_output_fields?.length && block.else_condition) ? block.else_condition : undefined,
        else_value: (block.else_output_fields?.length && block.else_condition) ? formattedElseValue : undefined,
        output_fields: block.output_fields.filter((o) => o.field_api_name && o.action),
        else_output_fields: (block.else_output_fields || []).filter((o) => o.field_api_name && o.action),
      };
    });

    const rule: FormRule = {
      _uid: initialRule?._uid || `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      id: initialRule?.id,
      name,
      sequence: initialRule?.sequence || 0,
      rule_type: "advanced",
      blocks: formattedBlocks,
    };

    onSave(rule);
  };

  const renderValueInput = (block: FormRuleBlock, blockIdx: number, isElse = false) => {
    const condition = isElse ? (block.else_condition || block.condition) : block.condition;
    const rawValue = isElse ? (block.else_value !== undefined ? block.else_value : block.value) : block.value;
    const fieldApiName = block.field_api_name;

    const isValueDisabled = condition === "is_empty" || condition === "is_not_empty";
    if (isValueDisabled) {
      return (
        <input
          type="text"
          className="bg-gray-100 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] dark:bg-slate-800 cursor-not-allowed text-transparent w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-md outline-none"
          disabled
          value=""
        />
      );
    }

    const selectedField = fields.find((f) => f.value === fieldApiName);
    const fieldType = selectedField?.type;

    const blockValue = Array.isArray(rawValue) ? rawValue.join(", ") : (rawValue || "");
    const errorKey = isElse ? `block-${blockIdx}-elseRuleValue` : `block-${blockIdx}-ruleValue`;

    const handleChange = (val: any) => {
      if (isElse) {
        handleBlockChange(blockIdx, { else_value: val });
      } else {
        handleBlockChange(blockIdx, { value: val });
      }
    };

    if (fieldType === "date") {
      return (
        <input
          type="date"
          className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md outline-none`}
          value={blockValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      );
    }

    if (fieldType === "datetime") {
      return (
        <input
          type="datetime-local"
          className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md outline-none`}
          value={blockValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      );
    }

    if (fieldType === "phone" || fieldType === "mobile") {
      return (
        <div className="surface-phone-root w-full mt-1.5">
          <PhoneNumberInput
            value={blockValue}
            onChange={(val) => handleChange(val)}
            defaultCountry={DEFAULT_PHONE_COUNTRY}
            placeholder="Enter phone number"
            className="w-full"
            numberInputProps={{
              className: `w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md outline-none`,
            }}
          />
        </div>
      );
    }

    if (fieldType === "checkbox") {
      return (
        <select
          className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
          value={blockValue}
          onChange={(e) => handleChange(e.target.value)}
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
          className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
          value={blockValue}
          onChange={(e) => handleChange(e.target.value)}
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
        const parsedValues = blockValue
          ? blockValue.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        return (
          <div className="w-full">
            <MultiSelect
              name={`rule-value-multi-${isElse ? "else-" : ""}${blockIdx}`}
              options={fieldOptions}
              value={parsedValues}
              onChange={(newVal) => handleChange(newVal.join(", "))}
              placeholder="Select options..."
            />
          </div>
        );
      } else {
        return (
          <select
            className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
            value={blockValue}
            onChange={(e) => handleChange(e.target.value)}
          >
            <option value="">Select Option</option>
            {fieldOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      }
    }

    return (
      <input
        type="text"
        placeholder={condition === "is_any_one_of" || condition === "is_none_of" ? "comma, separated, values" : "Enter value"}
        className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md outline-none`}
        value={blockValue}
        onChange={(e) => handleChange(e.target.value)}
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
        className={`fixed right-0 z-[30] flex w-full 2xl:w-[40%] md:w-[45%] max-w-5xl flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:w-[50%] ${FORM_BUILDER_SUBHEADER_OFFSET} ${FORM_BUILDER_DRAWER_HEIGHT}`}
        role="dialog"
        aria-modal="true"
        aria-label="Form Rule"
      >
        <header className="flex  shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {initialRule ? "Edit Rule" : "Add Rule"}
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

        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
          {/* Rule Name */}
          <div className="flex flex-col gap-2 border-b border-gray-200 dark:border-slate-700 pb-4 border-dotted">
            <label htmlFor="rule-name" className="text-sm font-medium  dark:text-slate-100">
              Rule Name
            </label>
            <input
              type="text"
              id="rule-name"
              className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors.name ? "border-red-500" : "border-gray-200"} rounded-md dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 outline-none`}
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
          
          {/* Logic Blocks */}
          <div className="space-y-8">
            {blocks.map((block, idx) => {
              const availableIfFields = getAvailableIfFields(idx);

              return (
                <div
                  key={block._uid}
                  className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 relative group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm text-[color:var(--dash-accent)]">
                      Rule Block #{idx + 1}
                    </span>
                    {blocks.length > 1 && (
                      <AppButton
                        type="button"
                        variant="ghost"
                        className="text-red-500 p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        onClick={() => handleRemoveBlock(idx)}
                      >
                        <Trash2 className="size-4" /> Remove Block
                      </AppButton>
                    )}
                  </div>

                  <div className="flex flex-col">

                    {/* ── 1. IF row ─────────────────────────────────── */}
                    <div className="flex gap-4 items-stretch">
                      {/* Left Badge Column */}
                      <div className="flex flex-col items-center shrink-0 w-16">
                        <div className="w-px h-1 bg-transparent" />
                        <div className="bg-slate-600 text-white text-xs px-3.5 py-1.5 rounded font-medium shadow-sm">
                          If
                        </div>
                        <div className="w-px flex-1 bg-gray-300 dark:bg-slate-700 mt-1" />
                      </div>

                      {/* Right IF content */}
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center w-full">
                          <select
                            className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[`block-${idx}-triggerField`] ? "border-red-500" : "border-gray-300"} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
                            value={block.field_api_name}
                            onChange={(e) =>
                              handleBlockChange(idx, {
                                field_api_name: e.target.value,
                                value: "",
                                else_value: undefined,
                              })
                            }
                          >
                            <option value="">Select Field</option>
                            {availableIfFields.map((field) => (
                              <option key={field.value} value={field.value}>{field.label}</option>
                            ))}
                          </select>

                          <select
                            className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[`block-${idx}-condition`] ? "border-red-500" : "border-gray-300"} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
                            value={block.condition}
                            onChange={(e) => handleBlockChange(idx, { condition: e.target.value as RuleCondition })}
                          >
                            <option value="">Select Condition</option>
                            {conditionTypes.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>

                          {renderValueInput(block, idx)}
                        </div>
                        {(errors[`block-${idx}-triggerField`] || errors[`block-${idx}-condition`] || errors[`block-${idx}-ruleValue`]) && (
                          <span className="text-red-500 text-sm mt-1 block">Please complete the &quot;If&quot; condition fields</span>
                        )}
                      </div>
                    </div>

                    {/* ── 2. THEN row ────────────────────────────────── */}
                    <div className="flex gap-4 items-stretch pt-2">
                      {/* Left Badge Column (Then badge centered vertically with Then actions) */}
                      <div className="flex flex-col items-center shrink-0 w-16">
                        <div className="w-px flex-1 bg-gray-300 dark:bg-slate-700 mb-1" />
                        <div className="bg-slate-600 text-white text-xs px-3 py-1.5 rounded font-medium shadow-sm my-auto">
                          Then
                        </div>
                        <div className={`w-px flex-1 mt-1 ${showElseBlocks.has(block._uid) ? "bg-gray-300 dark:bg-slate-700" : "bg-transparent"}`} />
                      </div>

                      {/* Right THEN content */}
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex flex-col gap-3">
                          <span className="text-gray-700 text-xs font-medium dark:text-slate-200">
                            Perform the following actions:
                          </span>

                          {block.output_fields.map((output, outIdx) => {
                            const availableThenFields = getAvailableThenFields(idx, outIdx, false);
                            return (
                              <div key={outIdx} className="flex gap-3 items-center">
                                <select
                                  className="w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border border-gray-300 rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                                  value={output.action}
                                  onChange={(e) => handleOutputChange(idx, outIdx, "action", e.target.value, false)}
                                >
                                  {actionTypes.map((action) => (
                                    <option key={action.value} value={action.value}>{action.label}</option>
                                  ))}
                                </select>

                                <select
                                  className={`w-full p-2.5 border outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] ${!output.field_api_name && errors[`block-${idx}-outputs`] ? "border-red-500" : "border-gray-300"} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
                                  value={output.field_api_name}
                                  onChange={(e) => handleOutputChange(idx, outIdx, "field_api_name", e.target.value, false)}
                                >
                                  <option value="">Select Target Field</option>
                                  {availableThenFields.map((f) => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </select>

                                <AppButton
                                  type="button"
                                  variant="ghost"
                                  className={`text-red-500 p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 ${block.output_fields.length === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                                  onClick={() => handleRemoveOutput(idx, outIdx, false)}
                                  disabled={block.output_fields.length === 1}
                                >
                                  <Trash2 className="size-4" />
                                </AppButton>
                              </div>
                            );
                          })}

                          <div className="flex justify-between items-center">
                            <button
                              type="button"
                              className="text-[color:var(--dash-accent)] dark:text-blue-400 text-xs font-medium flex items-center gap-1 hover:underline"
                              onClick={() => handleAddOutput(idx, false)}
                            >
                              <Plus className="size-4" /> Add action
                            </button>
                            {errors[`block-${idx}-outputs`] && (
                              <span className="text-red-500 text-xs">{errors[`block-${idx}-outputs`]}</span>
                            )}
                          </div>

                          {!showElseBlocks.has(block._uid) && (
                            <button
                              type="button"
                              className="self-start text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center gap-1 hover:text-[color:var(--dash-accent)] hover:underline transition-colors mt-1"
                              onClick={() => toggleElseSection(block._uid, idx, true)}
                            >
                              <Plus className="size-3.5" /> Add Else
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── ELSE Section (Split into condition row + actions row) ── */}
                    {showElseBlocks.has(block._uid) && (() => {
                      const triggerFieldLabel = fields.find(f => f.value === block.field_api_name)?.label || block.field_api_name || "(select IF field first)";
                      const elseConditionValue = block.else_condition || "";
                      return (
                        <>
                          {/* ── 3. ELSE Condition row ── */}
                          <div className="flex gap-4 items-stretch pt-2">
                            {/* Left Badge Column */}
                            <div className="flex flex-col items-center shrink-0 w-16">
                              <div className="w-px flex-1 bg-gray-300 dark:bg-slate-700 mb-1" />
                              <div className="bg-slate-600 text-white text-xs px-3 py-1.5 rounded font-medium shadow-sm my-auto">
                                Else
                              </div>
                              <div className="w-px flex-1 bg-gray-300 dark:bg-slate-700 mt-1" />
                            </div>

                            {/* Right Content */}
                            <div className="flex-1 min-w-0 pb-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-700 text-xs font-medium dark:text-slate-200">
                                  Else — when:
                                </span>
                                <button
                                  type="button"
                                  className="text-red-400 text-xs font-medium hover:underline"
                                  onClick={() => toggleElseSection(block._uid, idx, false)}
                                >
                                  Remove Else
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center w-full">
                                <div className="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800 text-sm text-gray-700 dark:text-slate-300 truncate">
                                  {triggerFieldLabel}
                                </div>

                                <select
                                  className="w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border border-gray-300 rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                                  value={elseConditionValue}
                                  onChange={(e) => handleBlockChange(idx, { else_condition: (e.target.value as RuleCondition) || undefined })}
                                >
                                  <option value="">Otherwise (IF condition is false)</option>
                                  {conditionTypes.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                  ))}
                                </select>

                                {renderValueInput(block, idx, true)}
                              </div>
                            </div>
                          </div>

                          {/* ── 4. ELSE Actions row (with Then badge) ── */}
                          <div className="flex gap-4 items-stretch pt-2">
                            {/* Left Badge Column (Then badge inside Else) */}
                            <div className="flex flex-col items-center shrink-0 w-16">
                              <div className="w-px flex-1 bg-gray-300 dark:bg-slate-700 mb-1" />
                              <div className="bg-slate-600 text-white text-xs px-3 py-1.5 rounded font-medium shadow-sm my-auto">
                                Then
                              </div>
                              <div className="w-px flex-1 bg-transparent mt-1" />
                            </div>

                            {/* Right Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col gap-3">
                                <span className="text-gray-700 text-xs font-medium dark:text-slate-200">
                                  Perform the following actions:
                                </span>
                                {(block.else_output_fields || []).map((elseOutput, elseIdx) => {
                                  const availableElseFields = getAvailableThenFields(idx, elseIdx, true);
                                  return (
                                    <div key={elseIdx} className="flex gap-3 items-center">
                                      <select
                                        className="w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border border-gray-300 rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                                        value={elseOutput.action}
                                        onChange={(e) => handleOutputChange(idx, elseIdx, "action", e.target.value, true)}
                                      >
                                        {actionTypes.map((action) => (
                                          <option key={action.value} value={action.value}>{action.label}</option>
                                        ))}
                                      </select>

                                      <select
                                        className={`w-full p-2.5 border outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] ${!elseOutput.field_api_name && errors[`block-${idx}-else-outputs`] ? "border-red-500" : "border-gray-300"} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
                                        value={elseOutput.field_api_name}
                                        onChange={(e) => handleOutputChange(idx, elseIdx, "field_api_name", e.target.value, true)}
                                      >
                                        <option value="">Select Target Field</option>
                                        {availableElseFields.map((f) => (
                                          <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                      </select>

                                      <AppButton
                                        type="button"
                                        variant="ghost"
                                        className={`text-red-500 p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 ${(block.else_output_fields?.length ?? 0) <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                                        onClick={() => handleRemoveOutput(idx, elseIdx, true)}
                                        disabled={(block.else_output_fields?.length ?? 0) <= 1}
                                      >
                                        <Trash2 className="size-4" />
                                      </AppButton>
                                    </div>
                                  );
                                })}

                                <div className="flex justify-between items-center mt-1">
                                  <button
                                    type="button"
                                    className="text-[color:var(--dash-accent)] dark:text-blue-400 text-xs font-medium flex items-center gap-1 hover:underline"
                                    onClick={() => handleAddOutput(idx, true)}
                                  >
                                    <Plus className="size-4" /> Add action
                                  </button>
                                  {errors[`block-${idx}-else-outputs`] && (
                                    <span className="text-red-500 text-xs">{errors[`block-${idx}-else-outputs`]}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg text-gray-500 hover:text-[color:var(--dash-accent)]  hover:border-[color:var(--dash-accent)]  transition-colors flex items-center justify-center gap-2 font-medium"
            onClick={handleAddBlock}
          >
            <Plus className="size-5" /> Add Logic Block (IF/THEN)
          </button>
        </div>

        <div className="flex items-center justify-end gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <AppButton variant="secondary" size="md" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton size="md" onClick={handleSave}>
            Save Rule
          </AppButton>
        </div>
      </aside>
    </>
  );
};

export default FormAdvancedRuleModal;
