import { FormRule } from "../formbuilder/form-rules.types";

const normalizeCondition = (c: string): string => {
  if (!c) return c;
  return c.toLowerCase().replace(/\s+/g, '_');
};

export default function normalizeRules(rules: any[]): FormRule[] {
  return (rules ?? []).map((rule) => {
    const logic = rule.logic && typeof rule.logic === "object" ? rule.logic : rule;
    
    const ruleData: any = {
      id: rule.id,
      name: rule.name,
      is_custom: rule.is_custom ?? false,
      ...logic,
      condition: logic.condition ? normalizeCondition(logic.condition) : undefined,
    };

    if (logic.blocks) {
      ruleData.blocks = logic.blocks.map((b: any) => ({
        ...b,
        condition: b.condition ? normalizeCondition(b.condition) : undefined,
      }));
    }

    return ruleData;
  });
}