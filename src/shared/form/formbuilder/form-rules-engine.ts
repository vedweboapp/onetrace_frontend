import { FormRule, RuleCondition } from "./form-rules.types";

export function evaluateCondition(fieldValue: any, condition: RuleCondition, ruleValue: any): boolean {
  if (fieldValue === undefined || fieldValue === null) {
    if (condition === 'is_empty') return true;
    if (condition === 'is_not_empty') return false;
    fieldValue = '';
  }

  const strFieldValue = String(fieldValue).toLowerCase();
  
  switch (condition) {
    case 'is':
      return strFieldValue === String(ruleValue).toLowerCase();
    case 'is_not':
      return strFieldValue !== String(ruleValue).toLowerCase();
    case 'ends_with':
      return strFieldValue.endsWith(String(ruleValue).toLowerCase());
    case 'is_empty':
      return strFieldValue.trim() === '';
    case 'is_not_empty':
      return strFieldValue.trim() !== '';
    case 'is_any_one_of':
      if (Array.isArray(ruleValue)) {
        return ruleValue.some((val) => String(val).toLowerCase() === strFieldValue);
      }
      return false;
    case 'is_none_of':
      if (Array.isArray(ruleValue)) {
        return !ruleValue.some((val) => String(val).toLowerCase() === strFieldValue);
      }
      return true;
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
    for (const output of rule.output_fields) {
      const targetField = output.field_api_name;
      if (!stateMap.has(targetField)) {
        stateMap.set(targetField, { visible: true, required: false, disabled: false });
      }
      if (output.action === 'show') {
        stateMap.get(targetField)!.visible = false;
      }
    }
  }

  // 2. Evaluate rules sequentially and apply matched overrides.
  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);

  for (const rule of sortedRules) {
    const triggerValue = formValues[rule.field_api_name];
    const isMatch = evaluateCondition(triggerValue, rule.condition, rule.value);

    if (isMatch) {
      for (const output of rule.output_fields) {
        const targetField = output.field_api_name;
        
        // State should already exist from step 1
        const currentState = stateMap.get(targetField)!;

        switch (output.action) {
          case 'show':
            currentState.visible = true;
            break;
          case 'hide':
            currentState.visible = false;
            break;
          case 'require':
            currentState.required = true;
            break;
          case 'disable':
            currentState.disabled = true;
            break;
        }
      }
    }
  }

  return stateMap;
}
