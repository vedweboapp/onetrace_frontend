import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";

export type MaterialRequestFormMessages = {
  worker: string;
  requestedDate: string;
  job: string;
  item: string;
  quantity: string;
  atLeastOneJob: string;
  atLeastOneItem: string;
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
      items: z.array(
        z.object({
          job: optionalPositiveId(messages.job),
          item: optionalPositiveId(messages.item),
          quantity: z.string().trim(),
        }),
      ),
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

      let validItemCount = 0;
      data.items.forEach((row, index) => {
        const jobId = row.job.trim();
        const itemId = row.item.trim();
        const qtyRaw = row.quantity.trim();
        if (!jobId && !itemId && !qtyRaw) return;
        if (!/^\d+$/.test(jobId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items", index, "job"],
            message: messages.job,
          });
          return;
        }
        if (!/^\d+$/.test(itemId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items", index, "item"],
            message: messages.item,
          });
          return;
        }
        const qty = Number.parseFloat(qtyRaw);
        if (!Number.isFinite(qty) || qty <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items", index, "quantity"],
            message: messages.quantity,
          });
          return;
        }
        validItemCount += 1;
      });

      if (validItemCount === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message: messages.atLeastOneItem,
        });
      }
    });
}

export type MaterialRequestFormValues = z.infer<ReturnType<typeof createMaterialRequestFormSchema>>;
