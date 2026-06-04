import { FormRule, RuleCondition } from "./form-rules.types";

export function evaluateCondition(fieldValue: any, condition: RuleCondition, ruleValue: any): boolean {
  if (fieldValue === undefined || fieldValue === null) {
    if (condition === 'is_empty') return true;
    if (condition === 'is_not_empty') return false;
    fieldValue = '';
  }

  // Helper to convert rule value into an array of lowercase strings
  const toLowerArray = (val: any): string[] => {
    if (Array.isArray(val)) {
      return val.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
    }
    if (typeof val === 'string') {
      return val.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
    }
    return [String(val).trim().toLowerCase()].filter(Boolean);
  };

  const fieldValues = Array.isArray(fieldValue)
    ? fieldValue.map((v) => String(v).trim().toLowerCase())
    : [String(fieldValue).trim().toLowerCase()];

  const ruleValues = toLowerArray(ruleValue);

  switch (condition) {
    case 'is':
      if (Array.isArray(fieldValue)) {
        return fieldValue.some((fv) =>
          ruleValues.includes(String(fv).trim().toLowerCase())
        );
      }
      return ruleValues.includes(String(fieldValue).trim().toLowerCase());
    case 'is_not':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.some((fv) =>
          ruleValues.includes(String(fv).trim().toLowerCase())
        );
      }
      return !ruleValues.includes(String(fieldValue).trim().toLowerCase());
    case 'ends_with':
      const strFieldValue = String(fieldValue).toLowerCase();
      return ruleValues.some((rv) => strFieldValue.endsWith(rv));
    case 'is_empty':
      return fieldValues.length === 0 || (fieldValues.length === 1 && fieldValues[0] === '');
    case 'is_not_empty':
      return fieldValues.length > 0 && !(fieldValues.length === 1 && fieldValues[0] === '');
    case 'is_any_one_of':
      return fieldValues.some((fv) => ruleValues.includes(fv));
    case 'is_none_of':
      return !fieldValues.some((fv) => ruleValues.includes(fv));
    default:
      return false;
  }
}

export type FieldRuleState = {
  visible: boolean;
  required: boolean;
  disabled: boolean;
};

export function buildFieldRuleState(rules: FormRule[], formValues: Record<string, any>) {
  // Map of field_api_name -> FieldRuleState
  const stateMap = new Map<string, FieldRuleState>();

  // 1. Pre-process fields to establish base state.
  // If a field is targeted by ANY "show" action across all rules, its default state is hidden.
  // Otherwise, default state is visible=true, required=false, disabled=false.
  for (const rule of rules) {
    if (rule.rule_type === "advanced" && rule.blocks) {
      for (const block of rule.blocks) {
        for (const output of block.output_fields || []) {
          const targetField = output.field_api_name;
          if (!stateMap.has(targetField)) {
            stateMap.set(targetField, { visible: true, required: false, disabled: false });
          }
          if (output.action === "show") {
            stateMap.get(targetField)!.visible = false;
          }
        }
      }
    } else {
      for (const output of rule.output_fields || []) {
        const targetField = output.field_api_name;
        if (!stateMap.has(targetField)) {
          stateMap.set(targetField, { visible: true, required: false, disabled: false });
        }
        if (output.action === "show") {
          stateMap.get(targetField)!.visible = false;
        }
      }
    }
  }

  // 2. Evaluate rules sequentially and apply matched overrides.
  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);

  for (const rule of sortedRules) {
    if (rule.rule_type === "advanced" && rule.blocks) {
      for (const block of rule.blocks) {
        const triggerValue = formValues[block.field_api_name];
        const isMatch = evaluateCondition(triggerValue, block.condition, block.value);

        if (isMatch) {
          for (const output of block.output_fields || []) {
            const targetField = output.field_api_name;
            const currentState = stateMap.get(targetField)!;

            if (currentState) {
              switch (output.action) {
                case "show":
                  currentState.visible = true;
                  break;
                case "hide":
                  currentState.visible = false;
                  break;
                case "require":
                  currentState.required = true;
                  break;
                case "disable":
                  currentState.disabled = true;
                  break;
              }
            }
          }
        }
      }
    } else {
      const triggerValue = formValues[rule.field_api_name || ""];
      const isMatch = evaluateCondition(triggerValue, rule.condition!, rule.value);

      if (isMatch) {
        for (const output of rule.output_fields || []) {
          const targetField = output.field_api_name;
          
          // State should already exist from step 1
          const currentState = stateMap.get(targetField)!;

          if (currentState) {
            switch (output.action) {
              case "show":
                currentState.visible = true;
                break;
              case "hide":
                currentState.visible = false;
                break;
              case "require":
                currentState.required = true;
                break;
              case "disable":
                currentState.disabled = true;
                break;
            }
          }
        }
      }
    }
  }

  return stateMap;
}
