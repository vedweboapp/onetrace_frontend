import { z } from "zod";

export const SECTION_RULE_TARGET_PREFIX = "__section__:";
export const FIELD_RULE_TARGET_PREFIX = "__field__:";

export type RuleTargetType = "field" | "section";

export type RuleCondition = 
  | 'is' 
  | 'is_not' 
  | 'ends_with' 
  | 'is_empty' 
  | 'is_not_empty' 
  | 'is_any_one_of' 
  | 'is_none_of';

export type RuleAction = 'show' | 'hide' | 'require' | 'disable';

export type FormRuleOutput = {
  field_api_name: string;
  api_name?: string | null;
  field_id?: number | string | null;
  f_id?: number | string | null;
  field_uid?: string;
  section_id?: number | string | null;
  section_uid?: string;
  s_id?: number | string | null;
  u_id?: string;
  target_type?: RuleTargetType;
  action: RuleAction;
};

/** A single Else branch inside a rule block */
export type ElseBlock = {
  _uid: string;
  else_condition?: RuleCondition;
  else_value?: string | string[] | null;
  else_output_fields: FormRuleOutput[];
};

export type FormRuleBlock = {
  _uid: string;
  field_api_name: string;
  api_name?: string | null;
  field_id?: number | string | null;
  f_id?: number | string | null;
  field_uid?: string;
  s_id?: number | string | null;
  u_id?: string;
  condition: RuleCondition;
  value: string | string[] | null;
  output_fields: FormRuleOutput[];
  /** Multiple else branches (new multi-else design) */
  else_blocks?: ElseBlock[];
  /** @deprecated kept for backward compat – migrated to else_blocks on load */
  else_condition?: RuleCondition;
  /** @deprecated kept for backward compat */
  else_value?: string | string[] | null;
  /** @deprecated kept for backward compat */
  else_output_fields?: FormRuleOutput[];
};

export type FormRule = {
  _uid: string;              // client id for list management
  id?: number | string;      // backend id when saved
  rule_id?: number | string;
  uuid?: string;
  name: string;              // max 20 chars
  sequence: number;
  field_api_name?: string;    // trigger field (optional for advanced)
  api_name?: string | null;
  field_id?: number | string | null;
  f_id?: number | string | null;
  field_uid?: string;
  s_id?: number | string | null;
  u_id?: string;
  condition?: RuleCondition;  // optional for advanced
  value?: string | string[] | null; // optional for advanced
  output_fields?: FormRuleOutput[]; // optional for advanced
  rule_type?: "normal" | "advanced";
  blocks?: FormRuleBlock[];
};
