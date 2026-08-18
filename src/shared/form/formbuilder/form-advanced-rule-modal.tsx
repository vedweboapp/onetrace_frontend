"use client";

import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { AppButton } from "@/shared/ui/app-button";
import { FormRule, RuleCondition, FormRuleOutput, RuleAction, FormRuleBlock, ElseBlock } from "./form-rules.types";
import { RuleFieldSelect, type RuleFieldOption } from "./rule-field-select";
import MultiSelect from "../components/multi-select";
import { PhoneNumberInput, DEFAULT_PHONE_COUNTRY } from "@/shared/ui";
import { currencyList } from "../components/currency-list";

const FORM_BUILDER_SUBHEADER_OFFSET = "top-28";
const FORM_BUILDER_DRAWER_HEIGHT = "h-[calc(100dvh-7rem)]";

type FormAdvancedRuleModalProps = {
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

const createEmptyElseBlock = (): ElseBlock => ({
  _uid: `else-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  else_condition: undefined,
  else_value: undefined,
  else_output_fields: [{ field_api_name: "", action: "show" }],
});

const createEmptyBlock = (): FormRuleBlock => ({
  _uid: `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  field_api_name: "",
  condition: "is",
  value: "",
  output_fields: [{ field_api_name: "", action: "show" }],
  else_blocks: [],
});

/** Migrate old single-else fields → else_blocks array */
const migrateBlock = (b: FormRuleBlock): FormRuleBlock => {
  const hasSingleElse = b.else_output_fields && b.else_output_fields.length > 0;
  const hasNewElse = b.else_blocks && b.else_blocks.length > 0;
  if (hasSingleElse && !hasNewElse) {
    return {
      ...b,
      else_blocks: [{
        _uid: `else-migrated-${b._uid}`,
        else_condition: b.else_condition,
        else_value: b.else_value,
        else_output_fields: b.else_output_fields!,
      }],
      else_condition: undefined,
      else_value: undefined,
      else_output_fields: undefined,
    };
  }
  return { ...b, else_blocks: b.else_blocks || [] };
};

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
          ...migrateBlock(b),
          _uid: b._uid || `block-${Date.now()}-${Math.random()}`,
          output_fields: b.output_fields?.length
            ? b.output_fields
            : [{ field_api_name: "", action: "show" }],
        }))
      : [createEmptyBlock()]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Field availability helpers ───────────────────────────────────────────

  const getAvailableIfFields = (blockIdx: number) => {
    return fields.filter((field) => {
      if (field.optionKind === "section") return false;
      const typeLower = (field.type || "").toLowerCase();
      if (
        typeLower === "image_upload" ||
        typeLower === "imageupload" ||
        typeLower === "image" ||
        typeLower === "multi_image_upload" ||
        typeLower === "multi_image" ||
        typeLower === "multiple_images" ||
        typeLower === "file_upload" ||
        typeLower === "fileupload" ||
        typeLower === "file" ||
        typeLower === "signature"
      ) {
        return false;
      }

      const isUsedByOtherIf = blocks.some((b, i) => i !== blockIdx && b.field_api_name === field.value);
      const isUsedByFutureOrCurrentThen = blocks.some((b, i) => {
        if (i < blockIdx) return false;
        const inThen = b.output_fields.some(o => o.field_api_name === field.value);
        const inElse = (b.else_blocks || []).some(eb =>
          eb.else_output_fields.some(o => o.field_api_name === field.value)
        );
        return inThen || inElse;
      });

      return !isUsedByOtherIf && !isUsedByFutureOrCurrentThen;
    });
  };

  /**
   * Get available target fields for a THEN or ELSE action row.
   * Excludes:
   *  - Fields used as IF triggers in current/prior blocks
   *  - Fields used in other THEN rows of the same block (when !isElse)
   *  - Fields used in OTHER ELSE blocks of the same IF block and other rows within the same else block (when isElse)
   *  - Fields used in the THEN block of the same IF block (when isElse)
   */
  const getAvailableThenFields = (
    blockIdx: number,
    outputIdx: number,
    isElse: boolean,
    elseBlockIdx?: number
  ) => {
    const block = blocks[blockIdx];
    return fields.filter((field) => {
      // Exclude IF trigger fields (current and prior blocks)
      const isUsedInCurrentOrPrevIf = blocks.some((b, i) => {
        if (i > blockIdx) return false;
        return b.field_api_name === field.value;
      });
      if (isUsedInCurrentOrPrevIf) return false;

      if (!isElse) {
        // THEN row: exclude other rows in this THEN block
        const isUsedByOtherThen = block.output_fields.some((o, i) =>
          i !== outputIdx && o.field_api_name === field.value
        );
        if (isUsedByOtherThen) return false;

        // THEN row: exclude fields used by any ELSE block in this IF block
        const isUsedByElse = (block.else_blocks || []).some(eb =>
          eb.else_output_fields.some(o => o.field_api_name === field.value)
        );
        if (isUsedByElse) return false;
      } else {
        // ELSE row: exclude THEN fields of this IF block
        const isUsedByThen = block.output_fields.some(o => o.field_api_name === field.value);
        if (isUsedByThen) return false;

        // ELSE row: exclude fields in OTHER else blocks
        const isUsedByOtherElseBlock = (block.else_blocks || []).some((eb, ebIdx) => {
          if (ebIdx === elseBlockIdx) return false; // skip self
          return eb.else_output_fields.some(o => o.field_api_name === field.value);
        });
        if (isUsedByOtherElseBlock) return false;

        // ELSE row: exclude other rows within the SAME else block
        if (elseBlockIdx !== undefined) {
          const currentElseBlock = (block.else_blocks || [])[elseBlockIdx];
          if (currentElseBlock) {
            const isUsedByOtherRowInSameElse = currentElseBlock.else_output_fields.some((o, i) =>
              i !== outputIdx && o.field_api_name === field.value
            );
            if (isUsedByOtherRowInSameElse) return false;
          }
        }
      }

      return true;
    });
  };

  // ─── Block state handlers ─────────────────────────────────────────────────

  const handleAddBlock = () => setBlocks([...blocks, createEmptyBlock()]);

  const handleRemoveBlock = (idx: number) => {
    if (blocks.length > 1) setBlocks(blocks.filter((_, i) => i !== idx));
  };

  const handleBlockChange = (idx: number, updatedFields: Partial<FormRuleBlock>) => {
    setBlocks(blocks.map((block, i) => (i === idx ? { ...block, ...updatedFields } : block)));
  };

  // ─── THEN output row handlers ─────────────────────────────────────────────

  const handleAddThenOutput = (blockIdx: number) => {
    const block = blocks[blockIdx];
    handleBlockChange(blockIdx, {
      output_fields: [...block.output_fields, { field_api_name: "", action: "show" as RuleAction }],
    });
  };

  const handleRemoveThenOutput = (blockIdx: number, outputIdx: number) => {
    const block = blocks[blockIdx];
    if (block.output_fields.length > 1) {
      handleBlockChange(blockIdx, {
        output_fields: block.output_fields.filter((_, i) => i !== outputIdx),
      });
    }
  };

  const handleThenOutputChange = (
    blockIdx: number,
    outputIdx: number,
    field: keyof FormRuleOutput,
    value: any
  ) => {
    const block = blocks[blockIdx];
    const updatedOutputs = block.output_fields.map((output, i) => {
      if (i !== outputIdx) return output;
      if (field === "field_api_name" && typeof value === "string") {
        const option = fields.find((f) => f.value === value);
        return {
          ...output,
          field_api_name: value,
          api_name: option?.apiName || null,
          section_name: option?.optionKind === "section" ? (option.sectionLabel || option.label) : null,
          target_type: option?.targetType || (option?.optionKind === "section" ? "section" : "field"),
          field_id: option?.fieldId ?? option?.f_id ?? null,
          f_id: option?.f_id ?? option?.fieldId ?? null,
          field_uid: option?.fieldUid || option?.u_id,
          section_id: option?.sectionId || option?.s_id || null,
          section_uid: option?.sectionUid,
          s_id: option?.s_id ?? option?.sectionId ?? option?.sectionUid,
          u_id: option?.u_id ?? option?.fieldUid,
        };
      }
      return { ...output, [field]: value };
    });
    handleBlockChange(blockIdx, { output_fields: updatedOutputs });
  };

  // ─── ELSE block handlers ──────────────────────────────────────────────────

  const handleAddElseBlock = (blockIdx: number) => {
    const block = blocks[blockIdx];
    handleBlockChange(blockIdx, {
      else_blocks: [...(block.else_blocks || []), createEmptyElseBlock()],
    });
  };

  const handleRemoveElseBlock = (blockIdx: number, elseBlockIdx: number) => {
    const block = blocks[blockIdx];
    handleBlockChange(blockIdx, {
      else_blocks: (block.else_blocks || []).filter((_, i) => i !== elseBlockIdx),
    });
  };

  const handleElseBlockChange = (
    blockIdx: number,
    elseBlockIdx: number,
    updatedFields: Partial<ElseBlock>
  ) => {
    const block = blocks[blockIdx];
    const updatedElseBlocks = (block.else_blocks || []).map((eb, i) =>
      i === elseBlockIdx ? { ...eb, ...updatedFields } : eb
    );
    handleBlockChange(blockIdx, { else_blocks: updatedElseBlocks });
  };

  const handleAddElseOutput = (blockIdx: number, elseBlockIdx: number) => {
    const block = blocks[blockIdx];
    const eb = (block.else_blocks || [])[elseBlockIdx];
    if (!eb) return;
    const updated = [
      ...eb.else_output_fields,
      { field_api_name: "", action: "show" as RuleAction },
    ];
    handleElseBlockChange(blockIdx, elseBlockIdx, { else_output_fields: updated });
  };

  const handleRemoveElseOutput = (blockIdx: number, elseBlockIdx: number, outputIdx: number) => {
    const block = blocks[blockIdx];
    const eb = (block.else_blocks || [])[elseBlockIdx];
    if (!eb || eb.else_output_fields.length <= 1) return;
    const updated = eb.else_output_fields.filter((_, i) => i !== outputIdx);
    handleElseBlockChange(blockIdx, elseBlockIdx, { else_output_fields: updated });
  };

  const handleElseOutputChange = (
    blockIdx: number,
    elseBlockIdx: number,
    outputIdx: number,
    field: keyof FormRuleOutput,
    value: any
  ) => {
    const block = blocks[blockIdx];
    const eb = (block.else_blocks || [])[elseBlockIdx];
    if (!eb) return;
    const updated = eb.else_output_fields.map((o, i) => {
      if (i !== outputIdx) return o;
      if (field === "field_api_name" && typeof value === "string") {
        const option = fields.find((f) => f.value === value);
        return {
          ...o,
          field_api_name: value,
          api_name: option?.apiName || null,
          section_name: option?.optionKind === "section" ? (option.sectionLabel || option.label) : null,
          target_type: option?.targetType || (option?.optionKind === "section" ? "section" : "field"),
          field_id: option?.fieldId ?? option?.f_id ?? null,
          f_id: option?.f_id ?? option?.fieldId ?? null,
          field_uid: option?.fieldUid || option?.u_id,
          section_id: option?.sectionId || option?.s_id || null,
          section_uid: option?.sectionUid,
          s_id: option?.s_id ?? option?.sectionId ?? option?.sectionUid,
          u_id: option?.u_id ?? option?.fieldUid,
        };
      }
      return { ...o, [field]: value };
    });
    handleElseBlockChange(blockIdx, elseBlockIdx, { else_output_fields: updated });
  };

  // ─── Save ─────────────────────────────────────────────────────────────────

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
          const isUsedInCurrentOrFutureThen = blocks.some((b, i) => {
            if (i < idx) return false;
            const inThen = b.output_fields.some(o => o.field_api_name === block.field_api_name);
            const inElse = (b.else_blocks || []).some(eb =>
              eb.else_output_fields.some(o => o.field_api_name === block.field_api_name)
            );
            return inThen || inElse;
          });
          if (isUsedInCurrentOrFutureThen) {
            newErrors[`block-${idx}-triggerField`] = "Field cannot be used as trigger if it is targeted by current/future actions";
          } else {
            usedIfFields.add(block.field_api_name);
          }
        }
      }

      if (!block.condition) newErrors[`block-${idx}-condition`] = "Condition is required";
      if (
        block.condition !== "is_empty" &&
        block.condition !== "is_not_empty" &&
        !block.value
      ) {
        newErrors[`block-${idx}-ruleValue`] = "Value is required";
      }

      const validOutputs = block.output_fields.filter(o => o.field_api_name && o.action);
      if (validOutputs.length === 0) {
        newErrors[`block-${idx}-outputs`] = "At least one target field is required";
      }

      block.output_fields.forEach(o => {
        if (o.field_api_name) {
          if (usedThenFieldsInBlock.has(o.field_api_name)) {
            newErrors[`block-${idx}-outputs`] = "Each field can only be targeted once within the same rule block";
          } else {
            const isUsedInCurrentOrPrevIf = blocks.some((b, i) => {
              if (i > idx) return false;
              return b.field_api_name === o.field_api_name;
            });
            if (isUsedInCurrentOrPrevIf) {
              newErrors[`block-${idx}-outputs`] = "Field cannot be targeted if used as a trigger";
            } else {
              usedThenFieldsInBlock.add(o.field_api_name);
            }
          }
        }
      });

      if (block.field_api_name && validOutputs.some(o => o.field_api_name === block.field_api_name)) {
        newErrors[`block-${idx}-outputs`] = "Target field cannot be the same as trigger field";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Format blocks for save
    const formattedBlocks = blocks.map(block => {
      let formattedValue: string | string[] | null = Array.isArray(block.value)
        ? block.value.join(", ")
        : block.value;
      if (block.condition === "is_any_one_of" || block.condition === "is_none_of") {
        formattedValue = String(block.value).split(",").map(s => s.trim()).filter(Boolean);
      } else if (block.condition === "is_empty" || block.condition === "is_not_empty") {
        formattedValue = null;
      }

      const triggerOption = fields.find((f) => f.value === block.field_api_name);

      const enrichedThenOutputs = block.output_fields
        .filter(o => o.field_api_name && o.action)
        .map(o => {
          const option = fields.find((f) => f.value === o.field_api_name);
          return {
            ...o,
            api_name: option?.apiName ?? o.api_name ?? null,
            section_name: option?.optionKind === "section" ? (option.sectionLabel || option.label) : (o.section_name ?? null),
            target_type: o.target_type || option?.targetType || (option?.optionKind === "section" ? "section" : "field"),
            field_id: o.field_id ?? o.f_id ?? option?.fieldId ?? option?.f_id ?? null,
            f_id: o.f_id ?? o.field_id ?? option?.f_id ?? option?.fieldId ?? null,
            field_uid: o.field_uid ?? option?.fieldUid ?? option?.u_id,
            section_id: o.section_id ?? option?.sectionId ?? option?.s_id ?? null,
            section_uid: o.section_uid ?? option?.sectionUid,
            s_id: o.s_id ?? option?.s_id ?? option?.sectionId ?? option?.sectionUid,
            u_id: o.u_id ?? option?.u_id ?? option?.fieldUid,
          };
        });

      const formattedElseBlocks = (block.else_blocks || [])
        .filter(eb => eb.else_output_fields.some(o => o.field_api_name && o.action))
        .map(eb => {
          let formattedElseValue: string | string[] | null | undefined = undefined;
          if (eb.else_condition) {
            const elseVal = eb.else_value;
            if (eb.else_condition === "is_any_one_of" || eb.else_condition === "is_none_of") {
              formattedElseValue = elseVal
                ? String(elseVal).split(",").map(s => s.trim()).filter(Boolean)
                : [];
            } else if (eb.else_condition === "is_empty" || eb.else_condition === "is_not_empty") {
              formattedElseValue = null;
            } else {
              formattedElseValue = Array.isArray(elseVal) ? elseVal.join(", ") : (elseVal ?? null);
            }
          }

          const enrichedElseOutputs = eb.else_output_fields
            .filter(o => o.field_api_name && o.action)
            .map(o => {
              const option = fields.find((f) => f.value === o.field_api_name);
              return {
                ...o,
                api_name: option?.apiName ?? o.api_name ?? null,
                section_name: option?.optionKind === "section" ? (option.sectionLabel || option.label) : (o.section_name ?? null),
                target_type: o.target_type || option?.targetType || (option?.optionKind === "section" ? "section" : "field"),
                field_id: o.field_id ?? o.f_id ?? option?.fieldId ?? option?.f_id ?? null,
                f_id: o.f_id ?? o.field_id ?? option?.f_id ?? option?.fieldId ?? null,
                field_uid: o.field_uid ?? option?.fieldUid ?? option?.u_id,
                section_id: o.section_id ?? option?.sectionId ?? option?.s_id ?? null,
                section_uid: o.section_uid ?? option?.sectionUid,
                s_id: o.s_id ?? option?.s_id ?? option?.sectionId ?? option?.sectionUid,
                u_id: o.u_id ?? option?.u_id ?? option?.fieldUid,
              };
            });

          return {
            ...eb,
            else_condition: eb.else_condition || undefined,
            else_value: eb.else_condition ? formattedElseValue : undefined,
            else_output_fields: enrichedElseOutputs,
          };
        });

      return {
        ...block,
        api_name: triggerOption?.apiName ?? block.api_name ?? null,
        field_id: block.field_id ?? block.f_id ?? triggerOption?.fieldId ?? triggerOption?.f_id ?? null,
        f_id: block.f_id ?? block.field_id ?? triggerOption?.f_id ?? triggerOption?.fieldId ?? null,
        field_uid: block.field_uid ?? triggerOption?.fieldUid ?? triggerOption?.u_id,
        s_id: block.s_id ?? triggerOption?.s_id ?? triggerOption?.sectionId ?? triggerOption?.sectionUid,
        u_id: block.u_id ?? triggerOption?.u_id ?? triggerOption?.fieldUid,
        value: formattedValue,
        output_fields: enrichedThenOutputs,
        else_blocks: formattedElseBlocks,
        // clear old deprecated fields
        else_condition: undefined,
        else_value: undefined,
        else_output_fields: undefined,
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

  // ─── Value input renderer (shared by IF and ELSE) ─────────────────────────

  const renderValueInput = (
    block: FormRuleBlock,
    blockIdx: number,
    elseCtx?: { elseBlock: ElseBlock; elseBlockIdx: number }
  ) => {
    const condition = elseCtx ? (elseCtx.elseBlock.else_condition || block.condition) : block.condition;
    const rawValue = elseCtx
      ? (elseCtx.elseBlock.else_value !== undefined ? elseCtx.elseBlock.else_value : block.value)
      : block.value;
    const fieldApiName = block.field_api_name;
    const errorKey = elseCtx
      ? `block-${blockIdx}-else${elseCtx.elseBlockIdx}-value`
      : `block-${blockIdx}-ruleValue`;

    const isValueDisabled = condition === "is_empty" || condition === "is_not_empty";
    if (isValueDisabled) {
      return (
        <input
          type="text"
          className="bg-gray-100 outline-none dark:bg-slate-800 cursor-not-allowed text-transparent w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-md"
          disabled
          value=""
        />
      );
    }

    const selectedField = fields.find(f => f.value === fieldApiName);
    const fieldType = selectedField?.type;
    const blockValue = Array.isArray(rawValue) ? rawValue.join(", ") : (rawValue || "");

    const handleChange = (val: any) => {
      if (elseCtx) {
        handleElseBlockChange(blockIdx, elseCtx.elseBlockIdx, { else_value: val });
      } else {
        handleBlockChange(blockIdx, { value: val });
      }
    };

    if (fieldType === "date") {
      return (
        <input type="date"
          className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md`}
          value={blockValue} onChange={e => handleChange(e.target.value)} />
      );
    }
    if (fieldType === "datetime") {
      return (
        <input type="datetime-local"
          className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md`}
          value={blockValue} onChange={e => handleChange(e.target.value)} />
      );
    }
    if (fieldType === "phone" || fieldType === "mobile") {
      return (
        <div className="surface-phone-root w-full mt-1.5">
          <PhoneNumberInput
            value={blockValue} onChange={val => handleChange(val)}
            defaultCountry={DEFAULT_PHONE_COUNTRY} placeholder="Enter phone number" className="w-full"
            numberInputProps={{
              className: `w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md`,
            }}
          />
        </div>
      );
    }
    if (fieldType === "checkbox") {
      return (
        <select
          className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
          value={blockValue} onChange={e => handleChange(e.target.value)}>
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
          value={blockValue} onChange={e => handleChange(e.target.value)}>
          <option value="">Select Currency</option>
          {currencyList.map(currency => (
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
        const parsedValues = blockValue ? blockValue.split(",").map(s => s.trim()).filter(Boolean) : [];
        return (
          <div className="w-full">
            <MultiSelect
              name={`rule-value-multi-${elseCtx ? `else${elseCtx.elseBlockIdx}-` : ""}${blockIdx}`}
              options={fieldOptions} value={parsedValues}
              onChange={newVal => handleChange(newVal.join(", "))} placeholder="Select options..." />
          </div>
        );
      } else {
        return (
          <select
            className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
            value={blockValue} onChange={e => handleChange(e.target.value)}>
            <option value="">Select Option</option>
            {fieldOptions.map((opt) => {
              const optionValue = typeof opt === "string" ? opt : opt.value;
              const optionLabel = typeof opt === "string" ? opt : opt.label;
              return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
            })}
          </select>
        );
      }
    }

    return (
      <input type="text"
        placeholder={condition === "is_any_one_of" || condition === "is_none_of" ? "comma, separated, values" : "Enter value"}
        className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[errorKey] ? "border-red-500" : "border-gray-300"} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-md`}
        value={blockValue} onChange={e => handleChange(e.target.value)} />
    );
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────

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
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {initialRule ? "Edit Rule" : "Add Rule"}
          </span>
          <AppButton type="button" variant="ghost" size="sm" className="size-9 p-0" aria-label="Close" onClick={onClose}>
            <X className="size-4" strokeWidth={2} aria-hidden />
          </AppButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
          {/* Rule Name */}
          <div className="flex flex-col gap-2 border-b border-gray-200 dark:border-slate-700 pb-4 border-dotted">
            <label htmlFor="rule-name" className="text-sm font-medium dark:text-slate-100">Rule Name</label>
            <input
              type="text" id="rule-name"
              className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors.name ? "border-red-500" : "border-gray-200"} rounded-md dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700`}
              placeholder="Enter Rule name" value={name}
              onChange={e => setName(e.target.value)} maxLength={20}
            />
            <div className="flex justify-between items-center">
              {errors.name
                ? <span className="text-red-500 text-sm">{errors.name}</span>
                : <span className="text-slate-500 text-sm">(Maximum 20 characters)</span>}
            </div>
          </div>

          {/* Logic Blocks */}
          <div className="space-y-8">
            {blocks.map((block, idx) => {
              const availableIfFields = getAvailableIfFields(idx);
              const hasElseBlocks = (block.else_blocks || []).length > 0;

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
                        type="button" variant="ghost"
                        className="text-red-500 p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        onClick={() => handleRemoveBlock(idx)}
                      >
                        <Trash2 className="size-4" /> Remove Block
                      </AppButton>
                    )}
                  </div>

                  <div className="flex flex-col">

                    {/* ── 1. IF row ── */}
                    <div className="flex gap-4 items-stretch">
                      <div className="flex flex-col items-center shrink-0 w-16">
                        <div className="w-px h-1 bg-transparent" />
                        <div className="bg-slate-600 text-white text-xs px-3.5 py-1.5 rounded font-medium shadow-sm">If</div>
                        <div className="w-px flex-1 bg-gray-300 dark:bg-slate-700 mt-1" />
                      </div>
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center w-full">
                          <RuleFieldSelect
                            className="w-full"
                            value={block.field_api_name}
                            onChange={(value) => handleBlockChange(idx, { field_api_name: value, value: "", else_blocks: [] })}
                            options={availableIfFields}
                            placeholder="Select Field"
                            invalid={!!errors[`block-${idx}-triggerField`]}
                            listLabel="Trigger fields"
                          />

                          <select
                            className={`w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border ${errors[`block-${idx}-condition`] ? "border-red-500" : "border-gray-300"} rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`}
                            value={block.condition}
                            onChange={e => handleBlockChange(idx, { condition: e.target.value as RuleCondition })}
                          >
                            <option value="">Select Condition</option>
                            {conditionTypes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>

                          {renderValueInput(block, idx)}
                        </div>
                        {(errors[`block-${idx}-triggerField`] || errors[`block-${idx}-condition`] || errors[`block-${idx}-ruleValue`]) && (
                          <span className="text-red-500 text-sm mt-1 block">Please complete the &quot;If&quot; condition fields</span>
                        )}
                      </div>
                    </div>

                    {/* ── 2. THEN row ── */}
                    <div className="flex gap-4 items-stretch pt-2">
                      <div className="flex flex-col items-center shrink-0 w-16">
                        <div className="w-px flex-1 bg-gray-300 dark:bg-slate-700 mb-1" />
                        <div className="bg-slate-600 text-white text-xs px-3 py-1.5 rounded font-medium shadow-sm my-auto">Then</div>
                        <div className={`w-px flex-1 mt-1 ${hasElseBlocks ? "bg-gray-300 dark:bg-slate-700" : "bg-transparent"}`} />
                      </div>
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex flex-col gap-3">
                          <span className="text-gray-700 text-xs font-medium dark:text-slate-200">Perform the following actions:</span>

                          {block.output_fields.map((output, outIdx) => {
                            const availableThenFields = getAvailableThenFields(idx, outIdx, false);
                            return (
                              <div key={outIdx} className="flex gap-3 items-center">
                                <select
                                  className="w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border border-gray-300 rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                                  value={output.action}
                                  onChange={e => handleThenOutputChange(idx, outIdx, "action", e.target.value)}
                                >
                                  {actionTypes.map(action => <option key={action.value} value={action.value}>{action.label}</option>)}
                                </select>

                                <RuleFieldSelect
                                  className="w-full"
                                  value={output.field_api_name}
                                  onChange={(value) => handleThenOutputChange(idx, outIdx, "field_api_name", value)}
                                  options={availableThenFields}
                                  placeholder="Select Target Field"
                                  invalid={!output.field_api_name && !!errors[`block-${idx}-outputs`]}
                                  listLabel="Target fields and sections"
                                />

                                <AppButton
                                  type="button" variant="ghost"
                                  className={`text-red-500 p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 ${block.output_fields.length === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                                  onClick={() => handleRemoveThenOutput(idx, outIdx)}
                                  disabled={block.output_fields.length === 1}
                                >
                                  <Trash2 className="size-4" />
                                </AppButton>
                              </div>
                            );
                          })}

                          <div className="flex justify-between items-center">
                            <button type="button"
                              className="text-[color:var(--dash-accent)] dark:text-blue-400 text-xs font-medium flex items-center gap-1 hover:underline"
                              onClick={() => handleAddThenOutput(idx)}>
                              <Plus className="size-4" /> Add action
                            </button>
                            {errors[`block-${idx}-outputs`] && (
                              <span className="text-red-500 text-xs">{errors[`block-${idx}-outputs`]}</span>
                            )}
                          </div>

                          {/* Add Else button only when no else blocks exist yet */}
                          {!hasElseBlocks && (
                            <button type="button"
                              className="self-start text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center gap-1 hover:text-[color:var(--dash-accent)] hover:underline transition-colors mt-1"
                              onClick={() => handleAddElseBlock(idx)}>
                              <Plus className="size-3.5" /> Add Else
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── ELSE blocks (multiple) ── */}
                    {(block.else_blocks || []).map((elseBlock, elseBlockIdx) => {
                      const triggerFieldLabel = fields.find(f => f.value === block.field_api_name)?.label
                        || block.field_api_name || "(select IF field first)";
                      const elseConditionValue = elseBlock.else_condition || "";
                      const isLastElse = elseBlockIdx === (block.else_blocks || []).length - 1;

                      return (
                        <React.Fragment key={elseBlock._uid}>
                          {/* ── Else condition row ── */}
                          <div className="flex gap-4 items-stretch pt-2">
                            <div className="flex flex-col items-center shrink-0 w-16">
                              <div className="w-px flex-1 bg-gray-300 dark:bg-slate-700 mb-1" />
                              <div className="bg-slate-600 text-white text-xs px-3 py-1.5 rounded font-medium shadow-sm my-auto whitespace-nowrap">
                                Else {(block.else_blocks || []).length > 1 ? `${elseBlockIdx + 1}` : ""}
                              </div>
                              <div className="w-px flex-1 bg-gray-300 dark:bg-slate-700 mt-1" />
                            </div>
                            <div className="flex-1 min-w-0 pb-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-700 text-xs font-medium dark:text-slate-200">
                                  Else {(block.else_blocks || []).length > 1 ? `#${elseBlockIdx + 1}` : ""} — when:
                                </span>
                                <button type="button"
                                  className="text-red-400 text-xs font-medium hover:underline"
                                  onClick={() => handleRemoveElseBlock(idx, elseBlockIdx)}>
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
                                  onChange={e => handleElseBlockChange(idx, elseBlockIdx, {
                                    else_condition: (e.target.value as RuleCondition) || undefined,
                                    else_value: undefined,
                                  })}
                                >
                                  <option value="" disabled hidden>Select Condition</option>
                                  {conditionTypes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                                {renderValueInput(block, idx, { elseBlock, elseBlockIdx })}
                              </div>
                            </div>
                          </div>

                          {/* ── Else Then row ── */}
                          <div className="flex gap-4 items-stretch pt-2">
                            <div className="flex flex-col items-center shrink-0 w-16">
                              <div className="w-px flex-1 bg-gray-300 dark:bg-slate-700 mb-1" />
                              <div className="bg-slate-600 text-white text-xs px-3 py-1.5 rounded font-medium shadow-sm my-auto">Then</div>
                              <div className={`w-px flex-1 mt-1 ${!isLastElse ? "bg-gray-300 dark:bg-slate-700" : "bg-transparent"}`} />
                            </div>
                            <div className="flex-1 min-w-0 pb-2">
                              <div className="flex flex-col gap-3">
                                <span className="text-gray-700 text-xs font-medium dark:text-slate-200">Perform the following actions:</span>
                                {elseBlock.else_output_fields.map((elseOutput, outIdx) => {
                                  const availableElseFields = getAvailableThenFields(idx, outIdx, true, elseBlockIdx);
                                  return (
                                    <div key={outIdx} className="flex gap-3 items-center">
                                      <select
                                        className="w-full p-2.5 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] border border-gray-300 rounded-md dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                                        value={elseOutput.action}
                                        onChange={e => handleElseOutputChange(idx, elseBlockIdx, outIdx, "action", e.target.value)}
                                      >
                                        {actionTypes.map(action => <option key={action.value} value={action.value}>{action.label}</option>)}
                                      </select>
                                      <RuleFieldSelect
                                        className="w-full"
                                        value={elseOutput.field_api_name}
                                        onChange={(value) => handleElseOutputChange(idx, elseBlockIdx, outIdx, "field_api_name", value)}
                                        options={availableElseFields}
                                        placeholder="Select Target Field"
                                        invalid={!elseOutput.field_api_name && !!errors[`block-${idx}-else${elseBlockIdx}-outputs`]}
                                        listLabel="Target fields and sections"
                                      />
                                      <AppButton
                                        type="button" variant="ghost"
                                        className={`text-red-500 p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 ${elseBlock.else_output_fields.length <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                                        onClick={() => handleRemoveElseOutput(idx, elseBlockIdx, outIdx)}
                                        disabled={elseBlock.else_output_fields.length <= 1}
                                      >
                                        <Trash2 className="size-4" />
                                      </AppButton>
                                    </div>
                                  );
                                })}
                                <div className="flex justify-between items-center mt-1">
                                  <button type="button"
                                    className="text-[color:var(--dash-accent)] dark:text-blue-400 text-xs font-medium flex items-center gap-1 hover:underline"
                                    onClick={() => handleAddElseOutput(idx, elseBlockIdx)}>
                                    <Plus className="size-4" /> Add action
                                  </button>
                                  {errors[`block-${idx}-else${elseBlockIdx}-outputs`] && (
                                    <span className="text-red-500 text-xs">{errors[`block-${idx}-else${elseBlockIdx}-outputs`]}</span>
                                  )}
                                </div>
                                {/* Add Else button after the last else block's actions */}
                                {isLastElse && (
                                  <button type="button"
                                    className="self-start text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center gap-1 hover:text-[color:var(--dash-accent)] hover:underline transition-colors mt-1"
                                    onClick={() => handleAddElseBlock(idx)}>
                                    <Plus className="size-3.5" /> Add Else
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}

                  </div>
                </div>
              );
            })}
          </div>

          <button type="button"
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg text-gray-500 hover:text-[color:var(--dash-accent)] hover:border-[color:var(--dash-accent)] transition-colors flex items-center justify-center gap-2 font-medium"
            onClick={handleAddBlock}>
            <Plus className="size-5" /> Add Logic Block (IF/THEN)
          </button>
        </div>

        <div className="flex items-center justify-end gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <AppButton variant="secondary" size="md" onClick={onClose}>Cancel</AppButton>
          <AppButton size="md" onClick={handleSave}>Save Rule</AppButton>
        </div>
      </aside>
    </>
  );
};

export default FormAdvancedRuleModal;
