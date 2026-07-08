import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";

export type JobFormMessages = {
  // title: string;
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
      // title: zTrimmedNonEmpty(messages.title),
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
      checklists: z.array(z.string()).optional(),
      job_meta_items: z
        .array(
          z.object({
            group: optionalPositiveId(messages.optionalId),
            group_name: z.string(),
            item: optionalPositiveId(messages.optionalId),
            item_name: z.string(),
            quantity: z.string().trim(),
            rate: z.string().trim(),
          }),
        )
        .min(1),
    })
    .superRefine((data, ctx) => {
      data.job_meta_items.forEach((row, index) => {
        const itemId = row.item.trim();
        const qty = row.quantity.trim();
        const group = row.group.trim();
        if (!itemId && !qty && !group) return;
        if (!itemId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["job_meta_items", index, "item"],
            message: messages.optionalId,
          });
          return;
        }
        const n = Number.parseFloat(qty);
        if (!Number.isFinite(n) || n <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["job_meta_items", index, "quantity"],
            message: messages.compositeQuantity,
          });
        }
      });
    });
}

export type JobFormValues = z.infer<ReturnType<typeof createJobFormSchema>>;
