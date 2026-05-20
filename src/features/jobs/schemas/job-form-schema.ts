import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";

export type JobFormMessages = {
  title: string;
  assignedWorker: string;
  startDate: string;
  endDate: string;
  endBeforeStart: string;
};

export function createJobFormSchema(messages: JobFormMessages) {
  return z
    .object({
      title: zTrimmedNonEmpty(messages.title),
      description: z.string(),
      assigned_worker: z
        .string()
        .trim()
        .min(1, { message: messages.assignedWorker })
        .refine((v) => /^\d+$/.test(v) && Number.parseInt(v, 10) > 0, {
          message: messages.assignedWorker,
        }),
      start_date: zTrimmedNonEmpty(messages.startDate),
      end_date: zTrimmedNonEmpty(messages.endDate),
      is_active: z.boolean(),
    })
    .superRefine((data, ctx) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
      if (end.getTime() < start.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["end_date"],
          message: messages.endBeforeStart,
        });
      }
    });
}

export type JobFormValues = z.infer<ReturnType<typeof createJobFormSchema>>;
