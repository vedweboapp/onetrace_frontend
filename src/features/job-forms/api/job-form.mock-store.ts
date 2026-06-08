import type { JobFormSubmission } from "@/features/job-forms/types/job-form-submission.types";

type JobFormMockDatabase = {
  nextId: number;
  submissions: Record<string, JobFormSubmission>;
};

const globalForMock = globalThis as typeof globalThis & {
  __onetraceJobFormMockDb?: JobFormMockDatabase;
};

function emptyDb(): JobFormMockDatabase {
  return { nextId: 1, submissions: {} };
}

function readDb(): JobFormMockDatabase {
  if (!globalForMock.__onetraceJobFormMockDb) {
    globalForMock.__onetraceJobFormMockDb = emptyDb();
  }
  return globalForMock.__onetraceJobFormMockDb;
}

function writeDb(db: JobFormMockDatabase) {
  globalForMock.__onetraceJobFormMockDb = db;
}

export function ensureJobFormMockDb(): JobFormMockDatabase {
  const db = readDb();
  writeDb(db);
  return db;
}

export function allocateJobFormSubmissionId(): number {
  const db = ensureJobFormMockDb();
  const id = db.nextId;
  db.nextId += 1;
  writeDb(db);
  return id;
}

export function upsertJobFormSubmission(row: JobFormSubmission) {
  const db = ensureJobFormMockDb();
  db.submissions[String(row.id)] = row;
  if (row.id >= db.nextId) db.nextId = row.id + 1;
  writeDb(db);
}

export function listJobFormSubmissions(jobId: number): JobFormSubmission[] {
  return Object.values(ensureJobFormMockDb().submissions)
    .filter((row) => row.job_id === jobId)
    .sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""));
}

export function getJobFormSubmission(jobId: number, submissionId: number): JobFormSubmission | null {
  const row = ensureJobFormMockDb().submissions[String(submissionId)];
  if (!row || row.job_id !== jobId) return null;
  return row;
}

export function findSubmissionByJobFormId(
  jobId: number,
  jobFormId: number,
): JobFormSubmission | null {
  return (
    listJobFormSubmissions(jobId).find(
      (row) => row.job_form_id === jobFormId || row.form_id === jobFormId,
    ) ?? null
  );
}
