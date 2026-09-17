import type { DrawingPin } from "@/features/projects/types/drawing.types";

export type PinFormMeta = {
  projectFormId: number;
  jobFormId: number;
  label: string;
  submissionId: number | null;
  submitted: boolean;
};

/** Resolve the assigned project form id from pin fields (formId / project_form). */
export function resolvePinProjectFormId(pin: DrawingPin): number | null {
  if (typeof pin.formId === "number" && pin.formId > 0) return pin.formId;
  if (typeof pin.project_form === "number" && pin.project_form > 0) return pin.project_form;
  if (pin.project_form && typeof pin.project_form === "object") {
    const id = pin.project_form.id;
    if (typeof id === "number" && id > 0) return id;
  }
  return null;
}

/** Resolve assigned/submitted form metadata from a drawing pin. */
export function resolvePinFormMeta(
  pin: DrawingPin,
  options?: {
    /** Job form entries used to refine ids / labels (job detail). */
    formEntries?: Array<{
      id: number;
      project_form_id?: number | null;
      name?: string | null;
      is_submitted?: boolean | null;
      submitted_form_id?: number | null;
    }>;
  },
): PinFormMeta | null {
  const pinProjectForm =
    pin.project_form && typeof pin.project_form === "object" ? pin.project_form : null;
  const pinProjectFormId = resolvePinProjectFormId(pin);
  if (pinProjectFormId == null) return null;

  const form = options?.formEntries?.find(
    (entry) => entry.project_form_id === pinProjectFormId || entry.id === pinProjectFormId,
  );

  const label =
    form?.name?.trim() ||
    (typeof pinProjectForm?.name === "string" ? pinProjectForm.name.trim() : "") ||
    `#${pinProjectFormId}`;

  const jobFormId = form?.id ?? pinProjectFormId;
  const projectFormId = form?.project_form_id ?? pinProjectFormId;

  const pinAny = pin as any;
  const pinProjectFormAny = pinProjectForm as any;

  const directSubmissionId =
    (typeof pinProjectFormAny?.submission_id === "number" && pinProjectFormAny.submission_id > 0
      ? pinProjectFormAny.submission_id
      : null) ??
    (typeof pinProjectFormAny?.submitted_form_id === "number" && pinProjectFormAny.submitted_form_id > 0
      ? pinProjectFormAny.submitted_form_id
      : null) ??
    (typeof pinAny?.submission_id === "number" && pinAny.submission_id > 0
      ? pinAny.submission_id
      : null) ??
    (typeof pinAny?.submitted_form_id === "number" && pinAny.submitted_form_id > 0
      ? pinAny.submitted_form_id
      : null) ??
    (typeof pinAny?.submission?.id === "number" && pinAny.submission.id > 0
      ? pinAny.submission.id
      : null);

  const apiSubmissionStatus =
    pinProjectForm?.submission_status ??
    pinAny?.submission_status ??
    pinAny?.status_name;

  const submissionId =
    directSubmissionId ??
    (typeof form?.submitted_form_id === "number" && form.submitted_form_id > 0
      ? form.submitted_form_id
      : null);

  const submitted =
    (typeof apiSubmissionStatus === "string" &&
      apiSubmissionStatus.toLowerCase() === "submitted") ||
    (submissionId != null && submissionId > 0) ||
    (form != null &&
      (typeof form.is_submitted === "boolean"
        ? form.is_submitted
        : typeof form.submitted_form_id === "number" && form.submitted_form_id > 0));

  return {
    projectFormId,
    jobFormId,
    label,
    submissionId,
    submitted: !!submitted,
  };
}
