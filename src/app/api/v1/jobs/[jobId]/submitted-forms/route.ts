import { fetchJobSubmittedFormsMock } from "@/features/job-forms/api/job-form.mock";

type RouteContext = { params: Promise<{ jobId: string }> };

function parseJobId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(request: Request, context: RouteContext) {
  const { jobFormMockRoutesEnabled, mockJsonError, mockJsonSuccess, proxyJobFormToBackend } =
    await import("@/features/job-forms/api/job-form.mock-route.util");

  const { jobId: rawJobId } = await context.params;
  if (!jobFormMockRoutesEnabled()) {
    return proxyJobFormToBackend(request, `jobs/${rawJobId}/submitted-forms/`);
  }

  const jobId = parseJobId(rawJobId);
  if (jobId == null) return mockJsonError("Invalid job id", 404);

  const items = await fetchJobSubmittedFormsMock(jobId);
  return mockJsonSuccess("Submitted forms fetched successfully", items);
}
