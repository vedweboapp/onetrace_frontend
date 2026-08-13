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
  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);

  // 1. Establish base state for all target fields across all rules.
  // Any field targeted by a "show" action defaults to visible=false.
  const baseDefaults = new Map<string, FieldRuleState>();

  for (const rule of sortedRules) {
    if (rule.rule_type === "advanced" && rule.blocks) {
      for (const block of rule.blocks) {
        for (const output of block.output_fields || []) {
          const targetField = output.field_api_name;
          if (!targetField) continue;
          if (!baseDefaults.has(targetField)) {
            baseDefaults.set(targetField, { visible: true, required: false, disabled: false });
          }
          if (output.action === "show") {
            baseDefaults.get(targetField)!.visible = false;
          }
        }
        for (const output of block.else_output_fields || []) {
          const targetField = output.field_api_name;
          if (!targetField) continue;
          if (!baseDefaults.has(targetField)) {
            baseDefaults.set(targetField, { visible: true, required: false, disabled: false });
          }
          if (output.action === "show") {
            baseDefaults.get(targetField)!.visible = false;
          }
        }
      }
    } else {
      for (const output of rule.output_fields || []) {
        const targetField = output.field_api_name;
        if (!targetField) continue;
        if (!baseDefaults.has(targetField)) {
          baseDefaults.set(targetField, { visible: true, required: false, disabled: false });
        }
        if (output.action === "show") {
          baseDefaults.get(targetField)!.visible = false;
        }
      }
    }
  }

  // Helper to clone state map
  const cloneStateMap = (map: Map<string, FieldRuleState>): Map<string, FieldRuleState> => {
    const next = new Map<string, FieldRuleState>();
    map.forEach((val, key) => {
      next.set(key, { ...val });
    });
    return next;
  };

  // Helper to check if two state maps are identical
  const areStateMapsEqual = (a: Map<string, FieldRuleState>, b: Map<string, FieldRuleState>): boolean => {
    if (a.size !== b.size) return false;
    for (const [key, valA] of a.entries()) {
      const valB = b.get(key);
      if (!valB) return false;
      if (valA.visible !== valB.visible || valA.required !== valB.required || valA.disabled !== valB.disabled) {
        return false;
      }
    }
    return true;
  };

  // 2. Iterative Multi-Pass Evaluation to resolve dependency chains
  let currentStateMap = cloneStateMap(baseDefaults);
  const MAX_PASSES = 10;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const nextStateMap = cloneStateMap(baseDefaults);

    for (const rule of sortedRules) {
      if (rule.rule_type === "advanced" && rule.blocks) {
        // Evaluate all blocks in this advanced rule first
        const blockMatches = rule.blocks.map((block) => {
          const triggerField = block.field_api_name;
          if (!triggerField) return false;
          const isTriggerVisible = !currentStateMap.has(triggerField) || currentStateMap.get(triggerField)!.visible !== false;
          if (!isTriggerVisible) return false;
          const triggerValue = formValues[triggerField];
          return evaluateCondition(triggerValue, block.condition, block.value);
        });

        // Evaluate else conditions independently (else_condition on the same IF field)
        const elseMatches = rule.blocks.map((block, bIdx) => {
          if (!block.else_output_fields?.length) return false;
          // If IF matched, else branch does not fire
          if (blockMatches[bIdx]) return false;

          const triggerField = block.field_api_name;
          if (!triggerField) return false;

          const isTriggerVisible = !currentStateMap.has(triggerField) || currentStateMap.get(triggerField)!.visible !== false;
          if (!isTriggerVisible) return false;

          // If else has its own explicit condition, evaluate it
          if (block.else_condition) {
            const triggerValue = formValues[triggerField];
            return evaluateCondition(triggerValue, block.else_condition, block.else_value ?? null);
          }

          // No explicit else_condition means: fire whenever IF condition is false
          return true;
        });

        // Collect all target fields with 'show' actions in this rule (from Then or Else blocks)
        const showTargetFields = new Set<string>();
        rule.blocks.forEach((block) => {
          (block.output_fields || []).forEach((output) => {
            if (output.field_api_name && output.action === "show") {
              showTargetFields.add(output.field_api_name);
            }
          });
          (block.else_output_fields || []).forEach((output) => {
            if (output.field_api_name && output.action === "show") {
              showTargetFields.add(output.field_api_name);
            }
          });
        });

        // Apply 'show' actions
        showTargetFields.forEach((targetField) => {
          let shouldShow = true;
          for (let bIdx = 0; bIdx < rule.blocks!.length; bIdx++) {
            const block = rule.blocks![bIdx];
            const hasShowInThen = (block.output_fields || []).some(
              (o) => o.field_api_name === targetField && o.action === "show"
            );
            const hasShowInElse = (block.else_output_fields || []).some(
              (o) => o.field_api_name === targetField && o.action === "show"
            );

            if (hasShowInThen && !blockMatches[bIdx]) {
              shouldShow = false;
              break;
            }
            if (hasShowInElse && !elseMatches[bIdx]) {
              shouldShow = false;
              break;
            }
          }

          if (shouldShow) {
            const currentState = nextStateMap.get(targetField);
            if (currentState) {
              currentState.visible = true;
            }
          }
        });

        // Apply non-'show' actions for THEN (if matched) and ELSE (if else matched)
        rule.blocks.forEach((block, bIdx) => {
          // Apply THEN actions when IF matches
          if (blockMatches[bIdx]) {
            (block.output_fields || []).forEach((output) => {
              const targetField = output.field_api_name;
              if (!targetField) return;
              const currentState = nextStateMap.get(targetField);
              if (currentState) {
                switch (output.action) {
                  case "hide": currentState.visible = false; break;
                  case "require": currentState.required = true; break;
                  case "disable": currentState.disabled = true; break;
                }
              }
            });
          }
          // Apply ELSE actions when else condition matches
          if (elseMatches[bIdx]) {
            (block.else_output_fields || []).forEach((output) => {
              const targetField = output.field_api_name;
              if (!targetField) return;
              const currentState = nextStateMap.get(targetField);
              if (currentState) {
                switch (output.action) {
                  case "hide": currentState.visible = false; break;
                  case "require": currentState.required = true; break;
                  case "disable": currentState.disabled = true; break;
                }
              }
            });
          }
        });
      } else {
        // Simple rule evaluation
        const triggerField = rule.field_api_name || "";
        const isTriggerVisible = !triggerField || !currentStateMap.has(triggerField) || currentStateMap.get(triggerField)!.visible !== false;
        
        if (isTriggerVisible && triggerField) {
          const triggerValue = formValues[triggerField];
          const isMatch = evaluateCondition(triggerValue, rule.condition!, rule.value);

          if (isMatch) {
            for (const output of rule.output_fields || []) {
              const targetField = output.field_api_name;
              if (!targetField) continue;
              const currentState = nextStateMap.get(targetField);
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
    }

    if (areStateMapsEqual(currentStateMap, nextStateMap)) {
      break;
    }
    currentStateMap = nextStateMap;
  }

  return currentStateMap;
}
