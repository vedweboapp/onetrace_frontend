import type { DrawingPin } from "@/features/projects/types/drawing.types";

export type PinFormMeta = {
  projectFormId: number;
  jobFormId: number;
  label: string;
  submissionId: number | null;
  submitted: boolean;
};

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
  const pinProjectFormId =
    typeof pin.formId === "number"
      ? pin.formId
      : typeof pin.project_form === "number"
        ? pin.project_form
        : pinProjectForm
          ? pinProjectForm.id
          : null;
  if (pinProjectFormId == null || pinProjectFormId <= 0) return null;

  const form = options?.formEntries?.find(
    (entry) => entry.project_form_id === pinProjectFormId || entry.id === pinProjectFormId,
  );

  const label =
    form?.name?.trim() ||
    (typeof pinProjectForm?.name === "string" ? pinProjectForm.name.trim() : "") ||
    `#${pinProjectFormId}`;

  const jobFormId = form?.id ?? pinProjectFormId;
  const projectFormId = form?.project_form_id ?? pinProjectFormId;

  const apiSubmissionId = pinProjectForm?.submission_id;
  const apiSubmissionStatus = pinProjectForm?.submission_status;

  const submissionId =
    typeof apiSubmissionId === "number" && apiSubmissionId > 0
      ? apiSubmissionId
      : typeof form?.submitted_form_id === "number" && form.submitted_form_id > 0
        ? form.submitted_form_id
        : null;

  const submitted =
    (typeof apiSubmissionStatus === "string" &&
      apiSubmissionStatus.toLowerCase() === "submitted") ||
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
