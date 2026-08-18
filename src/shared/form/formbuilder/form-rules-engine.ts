import type { FormRule, RuleCondition } from "./form-rules.types";

const normalizeConditionValue = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  }
  return [String(value ?? '').trim().toLowerCase()].filter(Boolean);
};

export function evaluateCondition(fieldValue: any, condition: RuleCondition, ruleValue: any): boolean {
  if (fieldValue === undefined || fieldValue === null) {
    if (condition === 'is_empty') return true;
    if (condition === 'is_not_empty') return false;
    fieldValue = '';
  }

  const fieldValues = Array.isArray(fieldValue)
    ? fieldValue.map((v) => String(v).trim().toLowerCase())
    : [String(fieldValue).trim().toLowerCase()];

  const ruleValues = normalizeConditionValue(ruleValue);

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

const getRuleTargetAliases = (
  fieldApiName?: string | null,
  fieldId?: number | string | null,
  fId?: number | string | null,
  apiName?: string | null,
): string[] => {
  const aliases = new Set<string>();

  // f_id is top priority
  const candidateIds = [fId, fieldId].filter((id) => id !== undefined && id !== null && id !== '');
  candidateIds.forEach((id) => {
    const value = String(id);
    aliases.add(value);
    aliases.add(`__field__:${value}`);
  });

  // field_api_name (which may be __field__:<id>) — stored value from dropdown
  if (fieldApiName) {
    aliases.add(fieldApiName);
    aliases.add(`__field__:${fieldApiName}`);
  }

  // api_name fallback — actual field api_name for post-save resolution
  if (apiName && apiName !== fieldApiName) {
    aliases.add(apiName);
    aliases.add(`__field__:${apiName}`);
  }

  return [...aliases];
};

const expandRuleTarget = (
  target: string | number | null | undefined,
  targetGroups?: RuleTargetGroups,
): string[] => {
  if (target === undefined || target === null || target === "") return [];
  const aliases = new Set<string>();
  const normalizedTarget = String(target);
  aliases.add(normalizedTarget);
  if (normalizedTarget.startsWith('__field__:')) {
    aliases.add(normalizedTarget.replace(/^__field__:/, ''));
  }
  if (normalizedTarget.startsWith('__section__:')) {
    aliases.add(normalizedTarget.replace(/^__section__:/, ''));
  }

  for (const alias of aliases) {
    const matched = targetGroups?.[alias];
    if (matched && matched.length) return matched;
  }

  return [normalizedTarget];
};

const getTriggerValue = (
  triggerField: string | number | null | undefined,
  formValues: Record<string, any>,
  targetGroups?: RuleTargetGroups,
  fallbackFieldApiName?: string | null,
  fallbackFieldId?: number | string | null,
  fallbackFId?: number | string | null,
  fallbackApiName?: string | null,
): any => {
  const aliases = new Set(getRuleTargetAliases(fallbackFieldApiName, fallbackFieldId, fallbackFId, fallbackApiName));
  if (triggerField !== undefined && triggerField !== null && triggerField !== '') {
    aliases.add(String(triggerField));
    aliases.add(`__field__:${String(triggerField)}`);
  }

  for (const alias of aliases) {
    if (formValues[alias] !== undefined) return formValues[alias];
    const expanded = expandRuleTarget(alias, targetGroups);
    for (const target of expanded) {
      if (formValues[target] !== undefined) return formValues[target];
    }
  }
  return undefined;
};

const checkTriggerVisible = (
  triggerField: string | number | null | undefined,
  currentStateMap: Map<string, FieldRuleState>,
  targetGroups?: RuleTargetGroups,
  fieldToSectionMap?: Record<string, string>,
  fallbackFieldApiName?: string | null,
  fallbackFieldId?: number | string | null,
  fallbackFId?: number | string | null,
  fallbackApiName?: string | null,
): boolean => {
  const aliases = new Set(getRuleTargetAliases(fallbackFieldApiName, fallbackFieldId, fallbackFId, fallbackApiName));
  if (triggerField !== undefined && triggerField !== null && triggerField !== '') {
    aliases.add(String(triggerField));
    aliases.add(`__field__:${String(triggerField)}`);
  }

  for (const alias of aliases) {
    const targets = expandRuleTarget(alias, targetGroups);
    for (const t of targets) {
      if (currentStateMap.has(t) && currentStateMap.get(t)!.visible === false) {
        return false;
      }
      if (fieldToSectionMap) {
        const secTarget = fieldToSectionMap[t] || fieldToSectionMap[alias];
        if (secTarget && currentStateMap.has(secTarget) && currentStateMap.get(secTarget)!.visible === false) {
          return false;
        }
      }
    }
    if (fieldToSectionMap) {
      const secTarget = fieldToSectionMap[alias];
      if (secTarget && currentStateMap.has(secTarget) && currentStateMap.get(secTarget)!.visible === false) {
        return false;
      }
    }
  }
  return true;
};

export function buildFieldRuleState(
  rules: FormRule[],
  formValues: Record<string, any>,
  targetGroups?: RuleTargetGroups,
  fieldToSectionMap?: Record<string, string>,
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
          const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
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
            const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
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
          const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
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
        const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
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
          const triggerField = block.field_api_name ?? block.field_id ?? block.f_id;
          if (!triggerField) return false;
          const isTriggerVisible = checkTriggerVisible(triggerField, currentStateMap, targetGroups, fieldToSectionMap, block.field_api_name, block.field_id, block.f_id, block.api_name);
          if (!isTriggerVisible) return false;
          const triggerValue = getTriggerValue(triggerField, formValues, targetGroups, block.field_api_name, block.field_id, block.f_id, block.api_name);
          return evaluateCondition(triggerValue, block.condition, block.value);
        });

const isValEmpty = (val: any): boolean => {
  if (val === undefined || val === null) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
};

        // Evaluate each else block independently
        // elseBlockMatches[bIdx][ebIdx] = whether else block ebIdx of rule block bIdx fires
        const elseBlockMatches = rule.blocks.map((block, bIdx) => {
          const triggerField = block.field_api_name ?? block.field_id ?? block.f_id;
          if (!triggerField) return [];

          const isTriggerVisible = checkTriggerVisible(triggerField, currentStateMap, targetGroups, fieldToSectionMap, block.field_api_name, block.field_id, block.f_id, block.api_name);
          if (!isTriggerVisible) return (block.else_blocks || []).map(() => false);

          const triggerValue = getTriggerValue(triggerField, formValues, targetGroups, block.field_api_name, block.field_id, block.f_id, block.api_name);
          const ifMatched = blockMatches[bIdx];
          const triggerIsEmpty = isValEmpty(triggerValue);

          return (block.else_blocks || []).map((eb) => {
            // An else block can only fire if the IF didn't match
            if (ifMatched) return false;

            // If the trigger field is empty/unselected, ELSE should not fire unless explicitly checking 'is_empty'
            if (triggerIsEmpty) {
              if (eb.else_condition === 'is_empty') {
                return true;
              }
              return false;
            }

            // If this else block has an explicit condition, evaluate it
            if (eb.else_condition) {
              return evaluateCondition(triggerValue, eb.else_condition, eb.else_value ?? null);
            }

            // No explicit condition → fire whenever IF is false and trigger has a value
            return true;
          });
        });

        // Legacy single else support (backward compat)
        const legacyElseMatches = rule.blocks.map((block, bIdx) => {
          if (!block.else_output_fields?.length) return false;
          if (blockMatches[bIdx]) return false;
          const triggerField = block.field_api_name ?? block.field_id ?? block.f_id;
          if (!triggerField) return false;
          const isTriggerVisible = checkTriggerVisible(triggerField, currentStateMap, targetGroups, fieldToSectionMap, block.field_api_name, block.field_id, block.f_id, block.api_name);
          if (!isTriggerVisible) return false;
          const triggerValue = getTriggerValue(triggerField, formValues, targetGroups, block.field_api_name, block.field_id, block.f_id, block.api_name);
          const triggerIsEmpty = isValEmpty(triggerValue);

          if (triggerIsEmpty) {
            if (block.else_condition === 'is_empty') {
              return true;
            }
            return false;
          }

          if (block.else_condition) {
            return evaluateCondition(triggerValue, block.else_condition, block.else_value ?? null);
          }
          return true;
        });

        // Collect all 'show' target fields from THEN and all ELSE blocks
        const showTargetFields = new Set<string>();
        rule.blocks.forEach((block) => {
          (block.output_fields || []).forEach((output) => {
            const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
            if (targetField && output.action === "show") {
              expandRuleTarget(targetField, targetGroups).forEach((target) => showTargetFields.add(target));
            }
          });
          (block.else_blocks || []).forEach((eb) => {
            eb.else_output_fields.forEach((output) => {
              const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
              if (targetField && output.action === "show") {
                expandRuleTarget(targetField, targetGroups).forEach((target) => showTargetFields.add(target));
              }
            });
          });
          // Legacy
          (block.else_output_fields || []).forEach((output) => {
            const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
            if (targetField && output.action === "show") {
              expandRuleTarget(targetField, targetGroups).forEach((target) => showTargetFields.add(target));
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
              o => o.action === "show" && expandRuleTarget(o.field_api_name ?? o.field_id ?? o.f_id, targetGroups).includes(targetField)
            );
            if (hasShowInThen && blockMatches[bIdx]) {
              shouldShow = true;
              break;
            }

            // Check each else block
            const ebMatches = elseBlockMatches[bIdx] || [];
            const hasShowInElse = (block.else_blocks || []).some((eb, ebIdx) =>
              ebMatches[ebIdx] && eb.else_output_fields.some(o =>
                o.action === "show" && expandRuleTarget(o.field_api_name ?? o.field_id ?? o.f_id, targetGroups).includes(targetField)
              )
            );
            if (hasShowInElse) {
              shouldShow = true;
              break;
            }

            // Legacy
            const hasShowInLegacyElse = (block.else_output_fields || []).some(
              o => o.action === "show" && expandRuleTarget(o.field_api_name ?? o.field_id ?? o.f_id, targetGroups).includes(targetField)
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
              const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
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
              const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
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
              const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
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
        const triggerField = rule.field_api_name ?? rule.field_id ?? rule.f_id ?? "";
        const isTriggerVisible = !triggerField || checkTriggerVisible(triggerField, currentStateMap, targetGroups, fieldToSectionMap, rule.field_api_name, rule.field_id, rule.f_id, rule.api_name);

        if (isTriggerVisible && triggerField) {
          const triggerValue = getTriggerValue(triggerField, formValues, targetGroups, rule.field_api_name, rule.field_id, rule.f_id, rule.api_name);
          const isMatch = evaluateCondition(triggerValue, rule.condition!, rule.value);

          if (isMatch) {
            for (const output of rule.output_fields || []) {
              const targetField = output.field_api_name ?? output.field_id ?? output.f_id;
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
