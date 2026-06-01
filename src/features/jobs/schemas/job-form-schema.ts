import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";

export type JobFormMessages = {
  title: string;
  assignedWorker: string;
  startDate: string;
  optionalId: string;
  compositeQuantity: string;
};

const optionalPositiveId = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number.parseInt(v, 10) > 0), { message });

export function createJobFormSchema(messages: JobFormMessages) {
  return z
    .object({
      title: zTrimmedNonEmpty(messages.title),
      description: z.string(),
      forms: z.array(z.string()),
      job_status: optionalPositiveId(messages.optionalId),
      client: optionalPositiveId(messages.optionalId),
      project: optionalPositiveId(messages.optionalId),
      site: optionalPositiveId(messages.optionalId),
      assigned_worker: z
        .string()
        .trim()
        .min(1, { message: messages.assignedWorker })
        .refine((v) => /^\d+$/.test(v) && Number.parseInt(v, 10) > 0, {
          message: messages.assignedWorker,
        }),
      start_date: zTrimmedNonEmpty(messages.startDate),
      job_meta_group: optionalPositiveId(messages.optionalId),
      job_meta_composite_item_id: optionalPositiveId(messages.optionalId),
      job_meta_composite_quantity: z.string().trim(),
    })
    .superRefine((data, ctx) => {
      const compositeId = data.job_meta_composite_item_id.trim();
      const qty = data.job_meta_composite_quantity.trim();
      if (compositeId && !qty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["job_meta_composite_quantity"],
          message: messages.compositeQuantity,
        });
      }
      if (qty && compositeId) {
        const n = Number.parseFloat(qty);
        if (!Number.isFinite(n) || n <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["job_meta_composite_quantity"],
            message: messages.compositeQuantity,
          });
        }
      }
    });
}

export type JobFormValues = z.infer<ReturnType<typeof createJobFormSchema>>;
