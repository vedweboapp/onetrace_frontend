import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";

export type MaterialRequestFormMessages = {
  worker: string;
  requestedDate: string;
  job: string;
  atLeastOneJob: string;
};

const optionalPositiveId = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number.parseInt(v, 10) > 0), { message });

export function createMaterialRequestFormSchema(messages: MaterialRequestFormMessages) {
  return z
    .object({
      worker_name: zTrimmedNonEmpty(messages.worker),
      requested_date: zTrimmedNonEmpty(messages.requestedDate),
      status: z.string(),
      jobs: z.array(z.object({ job: optionalPositiveId(messages.job) })),
      notes: z.string(),
    })
    .superRefine((data, ctx) => {
      const validJobs = data.jobs.filter((row) => /^\d+$/.test(row.job.trim()));
      if (validJobs.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["jobs"],
          message: messages.atLeastOneJob,
        });
      }
    });
}

export type MaterialRequestFormValues = z.infer<ReturnType<typeof createMaterialRequestFormSchema>>;
