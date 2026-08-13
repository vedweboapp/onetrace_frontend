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

export type RuleTargetGroups = Record<string, string[]>;

const expandRuleTarget = (
  target: string,
  targetGroups?: RuleTargetGroups,
): string[] => {
  if (!target) return [];
  return targetGroups?.[target] || [target];
};

export function buildFieldRuleState(
  rules: FormRule[],
  formValues: Record<string, any>,
  targetGroups?: RuleTargetGroups,
) {
  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);

  // 1. Establish base state for all target fields across all rules.
  // Any field targeted by a "show" action defaults to visible=false.
  const baseDefaults = new Map<string, FieldRuleState>();

  for (const rule of sortedRules) {
    if (rule.rule_type === "advanced" && rule.blocks) {
      for (const block of rule.blocks) {
        // THEN output fields
        for (const output of block.output_fields || []) {
          const targetField = output.field_api_name;
          if (!targetField) continue;
          expandRuleTarget(targetField, targetGroups).forEach((expandedTarget) => {
            if (!baseDefaults.has(expandedTarget)) {
              baseDefaults.set(expandedTarget, { visible: true, required: false, disabled: false });
            }
            if (output.action === "show") {
              baseDefaults.get(expandedTarget)!.visible = false;
            }
          });
        }
        // ELSE blocks (new multi-else)
        for (const eb of block.else_blocks || []) {
          for (const output of eb.else_output_fields || []) {
            const targetField = output.field_api_name;
            if (!targetField) continue;
            expandRuleTarget(targetField, targetGroups).forEach((expandedTarget) => {
              if (!baseDefaults.has(expandedTarget)) {
                baseDefaults.set(expandedTarget, { visible: true, required: false, disabled: false });
              }
              if (output.action === "show") {
                baseDefaults.get(expandedTarget)!.visible = false;
              }
            });
          }
        }
        // Legacy single else_output_fields (backward compat)
        for (const output of block.else_output_fields || []) {
          const targetField = output.field_api_name;
          if (!targetField) continue;
          expandRuleTarget(targetField, targetGroups).forEach((expandedTarget) => {
            if (!baseDefaults.has(expandedTarget)) {
              baseDefaults.set(expandedTarget, { visible: true, required: false, disabled: false });
            }
            if (output.action === "show") {
              baseDefaults.get(expandedTarget)!.visible = false;
            }
          });
        }
      }
    } else {
      for (const output of rule.output_fields || []) {
        const targetField = output.field_api_name;
        if (!targetField) continue;
        expandRuleTarget(targetField, targetGroups).forEach((expandedTarget) => {
          if (!baseDefaults.has(expandedTarget)) {
            baseDefaults.set(expandedTarget, { visible: true, required: false, disabled: false });
          }
          if (output.action === "show") {
            baseDefaults.get(expandedTarget)!.visible = false;
          }
        });
      }
    }
  }

  // Helper to clone state map
  const cloneStateMap = (map: Map<string, FieldRuleState>): Map<string, FieldRuleState> => {
    const next = new Map<string, FieldRuleState>();
    map.forEach((val, key) => { next.set(key, { ...val }); });
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
        // Evaluate all IF block conditions first
        const blockMatches = rule.blocks.map((block) => {
          const triggerField = block.field_api_name;
          if (!triggerField) return false;
          const isTriggerVisible = !currentStateMap.has(triggerField) || currentStateMap.get(triggerField)!.visible !== false;
          if (!isTriggerVisible) return false;
          const triggerValue = formValues[triggerField];
          return evaluateCondition(triggerValue, block.condition, block.value);
        });

        // Evaluate each else block independently
        // elseBlockMatches[bIdx][ebIdx] = whether else block ebIdx of rule block bIdx fires
        const elseBlockMatches = rule.blocks.map((block, bIdx) => {
          const triggerField = block.field_api_name;
          if (!triggerField) return [];

          const isTriggerVisible = !currentStateMap.has(triggerField) || currentStateMap.get(triggerField)!.visible !== false;
          if (!isTriggerVisible) return (block.else_blocks || []).map(() => false);

          const triggerValue = formValues[triggerField];
          const ifMatched = blockMatches[bIdx];

          return (block.else_blocks || []).map((eb) => {
            // An else block can only fire if the IF didn't match
            if (ifMatched) return false;

            // If this else block has an explicit condition, evaluate it
            if (eb.else_condition) {
              return evaluateCondition(triggerValue, eb.else_condition, eb.else_value ?? null);
            }

            // No explicit condition → fire whenever IF is false
            return true;
          });
        });

        // Legacy single else support (backward compat)
        const legacyElseMatches = rule.blocks.map((block, bIdx) => {
          if (!block.else_output_fields?.length) return false;
          if (blockMatches[bIdx]) return false;
          const triggerField = block.field_api_name;
          if (!triggerField) return false;
          const isTriggerVisible = !currentStateMap.has(triggerField) || currentStateMap.get(triggerField)!.visible !== false;
          if (!isTriggerVisible) return false;
          if (block.else_condition) {
            const triggerValue = formValues[triggerField];
            return evaluateCondition(triggerValue, block.else_condition, block.else_value ?? null);
          }
          return true;
        });

        // Collect all 'show' target fields from THEN and all ELSE blocks
        const showTargetFields = new Set<string>();
        rule.blocks.forEach((block) => {
          (block.output_fields || []).forEach((output) => {
            if (output.field_api_name && output.action === "show") {
              expandRuleTarget(output.field_api_name, targetGroups).forEach((target) => showTargetFields.add(target));
            }
          });
          (block.else_blocks || []).forEach((eb) => {
            eb.else_output_fields.forEach((output) => {
              if (output.field_api_name && output.action === "show") {
                expandRuleTarget(output.field_api_name, targetGroups).forEach((target) => showTargetFields.add(target));
              }
            });
          });
          // Legacy
          (block.else_output_fields || []).forEach((output) => {
            if (output.field_api_name && output.action === "show") {
              expandRuleTarget(output.field_api_name, targetGroups).forEach((target) => showTargetFields.add(target));
            }
          });
        });

        // Apply 'show' actions
        showTargetFields.forEach((targetField) => {
          let shouldShow = false;

          for (let bIdx = 0; bIdx < rule.blocks!.length; bIdx++) {
            const block = rule.blocks![bIdx];
            // Check THEN
            const hasShowInThen = (block.output_fields || []).some(
              o => o.action === "show" && expandRuleTarget(o.field_api_name, targetGroups).includes(targetField)
            );
            if (hasShowInThen && blockMatches[bIdx]) {
              shouldShow = true;
              break;
            }

            // Check each else block
            const ebMatches = elseBlockMatches[bIdx] || [];
            const hasShowInElse = (block.else_blocks || []).some((eb, ebIdx) =>
              ebMatches[ebIdx] && eb.else_output_fields.some(o =>
                o.action === "show" && expandRuleTarget(o.field_api_name, targetGroups).includes(targetField)
              )
            );
            if (hasShowInElse) {
              shouldShow = true;
              break;
            }

            // Legacy
            const hasShowInLegacyElse = (block.else_output_fields || []).some(
              o => o.action === "show" && expandRuleTarget(o.field_api_name, targetGroups).includes(targetField)
            );
            if (hasShowInLegacyElse && legacyElseMatches[bIdx]) {
              shouldShow = true;
              break;
            }
          }

          if (shouldShow) {
            const currentState = nextStateMap.get(targetField);
            if (currentState) currentState.visible = true;
          }
        });

        // Apply non-'show' actions for THEN and all ELSE blocks
        rule.blocks.forEach((block, bIdx) => {
          // Apply THEN actions when IF matches
          if (blockMatches[bIdx]) {
            (block.output_fields || []).forEach((output) => {
              const targetField = output.field_api_name;
              if (!targetField) return;
              expandRuleTarget(targetField, targetGroups).forEach((expandedTarget) => {
                const currentState = nextStateMap.get(expandedTarget);
                if (currentState) {
                  switch (output.action) {
                    case "hide": currentState.visible = false; break;
                    case "require": currentState.required = true; break;
                    case "disable": currentState.disabled = true; break;
                  }
                }
              });
            });
          }

          // Apply each ELSE block's actions when that else block fires
          const ebMatches = elseBlockMatches[bIdx] || [];
          (block.else_blocks || []).forEach((eb, ebIdx) => {
            if (!ebMatches[ebIdx]) return;
            eb.else_output_fields.forEach((output) => {
              const targetField = output.field_api_name;
              if (!targetField) return;
              expandRuleTarget(targetField, targetGroups).forEach((expandedTarget) => {
                const currentState = nextStateMap.get(expandedTarget);
                if (currentState) {
                  switch (output.action) {
                    case "hide": currentState.visible = false; break;
                    case "require": currentState.required = true; break;
                    case "disable": currentState.disabled = true; break;
                  }
                }
              });
            });
          });

          // Legacy single else
          if (legacyElseMatches[bIdx]) {
            (block.else_output_fields || []).forEach((output) => {
              const targetField = output.field_api_name;
              if (!targetField) return;
              expandRuleTarget(targetField, targetGroups).forEach((expandedTarget) => {
                const currentState = nextStateMap.get(expandedTarget);
                if (currentState) {
                  switch (output.action) {
                    case "hide": currentState.visible = false; break;
                    case "require": currentState.required = true; break;
                    case "disable": currentState.disabled = true; break;
                  }
                }
              });
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
              expandRuleTarget(targetField, targetGroups).forEach((expandedTarget) => {
                const currentState = nextStateMap.get(expandedTarget);
                if (currentState) {
                  switch (output.action) {
                    case "show": currentState.visible = true; break;
                    case "hide": currentState.visible = false; break;
                    case "require": currentState.required = true; break;
                    case "disable": currentState.disabled = true; break;
                  }
                }
              });
            }
          }
        }
      }
    }

    if (areStateMapsEqual(currentStateMap, nextStateMap)) break;
    currentStateMap = nextStateMap;
  }

  return currentStateMap;
}
