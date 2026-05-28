import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";

export type JobFormMessages = {
  title: string;
  assignedWorker: string;
  startDate: string;
  endDate: string;
  endBeforeStart: string;
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
      comments: z.string(),
      forms: optionalPositiveId(messages.optionalId),
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
      end_date: z.string().trim(),
      is_active: z.boolean(),
      job_meta_section_name: z.string(),
      job_meta_plot_name: z.string(),
      job_meta_plot_group: optionalPositiveId(messages.optionalId),
      job_meta_composite_item_id: optionalPositiveId(messages.optionalId),
      job_meta_composite_quantity: z.string().trim(),
    })
    .superRefine((data, ctx) => {
      const start = new Date(data.start_date);
      const endRaw = data.end_date.trim();
      if (endRaw) {
        const end = new Date(endRaw);
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end.getTime() < start.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["end_date"],
            message: messages.endBeforeStart,
          });
        }
      }

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
