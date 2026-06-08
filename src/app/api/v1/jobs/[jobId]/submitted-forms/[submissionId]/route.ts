import { fetchJobSubmittedFormMock } from "@/features/job-forms/api/job-form.mock";

type RouteContext = { params: Promise<{ jobId: string; submissionId: string }> };

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(request: Request, context: RouteContext) {
  const { jobFormMockRoutesEnabled, mockJsonError, mockJsonSuccess, proxyJobFormToBackend } =
    await import("@/features/job-forms/api/job-form.mock-route.util");

  const { jobId: rawJobId, submissionId: rawSubmissionId } = await context.params;
  if (!jobFormMockRoutesEnabled()) {
    return proxyJobFormToBackend(
      request,
      `jobs/${rawJobId}/submitted-forms/${rawSubmissionId}/`,
    );
  }

  const jobId = parseId(rawJobId);
  const submissionId = parseId(rawSubmissionId);
  if (jobId == null || submissionId == null) {
    return mockJsonError("Invalid id", 404);
  }

  const row = await fetchJobSubmittedFormMock(jobId, submissionId);
  if (!row) return mockJsonError("Submission not found", 404);
  return mockJsonSuccess("Submission fetched successfully", row);
}
