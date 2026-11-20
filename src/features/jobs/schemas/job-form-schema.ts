import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";

export type JobFormMessages = {
  // title: string;
  client: string;
  assignedWorker: string;
  startDate: string;
  optionalId: string;
  compositeQuantity: string;
  requiredChecklist: string;
  contactPersonTitle?: string;
  contactPerson?: string;
  contactPersonDuplicate?: string;
};

const optionalPositiveId = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number.parseInt(v, 10) > 0), { message });

export function createJobFormSchema(
  messages: JobFormMessages,
  options?: { requireScheduleFields?: boolean },
) {
  const requireScheduleFields = options?.requireScheduleFields ?? false;

  const assignedWorkerField = requireScheduleFields
    ? z
        .string()
        .trim()
        .min(1, { message: messages.assignedWorker })
        .refine((v) => /^\d+$/.test(v) && Number.parseInt(v, 10) > 0, {
          message: messages.assignedWorker,
        })
    : z
        .string()
        .trim()
        .refine((v) => v === "" || (/^\d+$/.test(v) && Number.parseInt(v, 10) > 0), {
          message: messages.assignedWorker,
        });

  const startDateField = requireScheduleFields
    ? zTrimmedNonEmpty(messages.startDate)
    : z.string().trim();

  return z
    .object({
      // title: zTrimmedNonEmpty(messages.title),
      description: z.string(),
      forms: z.array(z.string()),
      job_status: optionalPositiveId(messages.optionalId),
      client: z
        .string()
        .trim()
        .min(1, { message: messages.client })
        .refine((v) => /^\d+$/.test(v) && Number.parseInt(v, 10) > 0, {
          message: messages.client,
        }),
      contact_person: optionalPositiveId(messages.optionalId),
      project: optionalPositiveId(messages.optionalId),
      site: optionalPositiveId(messages.optionalId),
      job_category: z.string().optional(),
      assigned_worker: assignedWorkerField,
      start_date: startDateField,
      checklists: z.array(z.string()).min(1, { message: messages.requiredChecklist }),
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
      contacts: z
        .array(
          z.object({
            title: z.string().trim().min(1, messages.contactPersonTitle ?? "Select a title."),
            contact: z
              .string()
              .trim()
              .regex(/^\d+$/, messages.contactPerson ?? "Select a contact person.")
              .refine((s) => Number.parseInt(s, 10) > 0, {
                message: messages.contactPerson ?? "Select a contact person.",
              }),
          }),
        )
        .optional(),
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

      const contacts = data.contacts ?? [];
      const pairToFirstIndex = new Map<string, number>();
      for (let i = 0; i < contacts.length; i++) {
        const title = contacts[i]?.title?.trim() ?? "";
        const contact = contacts[i]?.contact?.trim() ?? "";
        if (!title || !contact) continue;
        const pairKey = `${title}\0${contact}`;
        const firstIndex = pairToFirstIndex.get(pairKey);
        if (firstIndex !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["contacts", i, "contact"],
            message:
              messages.contactPersonDuplicate ??
              "This title and contact person combination is already added.",
          });
        } else {
          pairToFirstIndex.set(pairKey, i);
        }
      }
    });
}

export type JobFormValues = z.infer<ReturnType<typeof createJobFormSchema>>;
