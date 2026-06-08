import {
  fetchJobSubmittedFormMock,
  fetchJobSubmittedFormsMock,
  submitJobFormMock,
} from "@/features/job-forms/api/job-form.mock";
import type { SubmitJobFormPayload } from "@/features/job-forms/types/job-form-submission.types";

type RouteContext = { params: Promise<{ jobId: string }> };

function parseJobId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function POST(request: Request, context: RouteContext) {
  const { jobFormMockRoutesEnabled, mockJsonError, mockJsonSuccess, proxyJobFormToBackend } =
    await import("@/features/job-forms/api/job-form.mock-route.util");

  const { jobId: rawJobId } = await context.params;
  if (!jobFormMockRoutesEnabled()) {
    return proxyJobFormToBackend(request, `jobs/${rawJobId}/submit-form/`);
  }

  const jobId = parseJobId(rawJobId);
  if (jobId == null) return mockJsonError("Invalid job id", 404);

  let body: SubmitJobFormPayload & { form_name?: string };
  try {
    body = (await request.json()) as SubmitJobFormPayload & { form_name?: string };
  } catch {
    return mockJsonError("Invalid JSON body");
  }

  if (!body.job_form_id || !Array.isArray(body.values)) {
    return mockJsonError("job_form_id and values are required");
  }

  const saved = await submitJobFormMock(jobId, body, body.form_name ?? null);
  return mockJsonSuccess("Form submitted successfully", saved);
}
