export type JobFormSubmissionValue = {
  field_id: number;
  value: string;
  field_label?: string | null;
  api_name?: string | null;
  field_type?: string | null;
};

export type JobFormSubmission = {
  id: number;
  job_id: number;
  job_form_id: number;
  form_id: number;
  project_form_id?: number;
  form_name?: string | null;
  status: string;
  remarks?: string | null;
  values: JobFormSubmissionValue[];
  submitted_at?: string | null;
  modified_at?: string | null;
};

/** POST /jobs/{id}/submit-form/ summary payload (fetch detail for full values). */
export type SubmitJobFormSummary = {
  submission_id: number;
  job_id: number;
  project_form_id: number;
  total_fields?: number;
};

export type SubmitJobFormPayload = {
  job_form_id: number;
  status?: string;
  remarks?: string;
  values: Array<{ field_id: number; value: string }>;
};

export type NormalizedFormField = {
  id?: number;
  api_name: string;
  field_label: string;
  field_type: string;
  readOnly?: boolean;
  [key: string]: unknown;
};

export type NormalizedFormSection = {
  name?: string;
  column_count?: number;
  is_subform?: boolean;
  subform_field_name?: string;
  sequence?: number;
  fields: NormalizedFormField[];
  [key: string]: unknown;
};

export type NormalizedJobFormSchema = {
  name: string;
  sections: NormalizedFormSection[];
  rules: unknown[];
};
