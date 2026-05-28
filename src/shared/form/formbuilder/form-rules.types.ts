  import { z } from "zod";

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
  field_id?: number | null;
  action: RuleAction;
};

export type FormRule = {
  _uid: string;              // client id for list management
  id?: number | string;      // backend id when saved
  rule_id?: number | string;
  uuid?: string;
  name: string;              // max 20 chars
  sequence: number;
  field_api_name: string;    // trigger field
  field_id?: number | null;
  condition: RuleCondition;
  value: string | string[] | null;
  output_fields: FormRuleOutput[];
};
