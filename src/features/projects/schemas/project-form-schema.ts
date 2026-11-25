import { z } from "zod";

export type ProjectFormMessages = {
  name: string;
  client: string;
  projectType: string;
  description: string;
  startDate: string;
  endDate: string;
  dateOrder: string;
  contactPersonTitle?: string;
  contactPerson?: string;
  contactPersonDuplicate?: string;
};

export function createProjectFormSchema(messages: ProjectFormMessages) {
  return z
    .object({
      name: z.string().trim().min(1, messages.name),
      client: z
        .string()
        .trim()
        .regex(/^\d+$/, messages.client)
        .refine((s) => Number.parseInt(s, 10) > 0, { message: messages.client }),
      project_type: z
        .string()
        .trim()
        .regex(/^\d+$/, messages.projectType)
        .refine((s) => Number.parseInt(s, 10) > 0, { message: messages.projectType }),
      description: z.string().trim().min(1, messages.description),
      sites: z.array(z.string()),
      form_ids: z.array(z.string()).optional(),
      project_status: z.string().optional(),
      start_date: z.string().trim().min(1, messages.startDate),
      end_date: z.string().trim().optional(),
      manager_ids: z.array(z.string()).optional(),
      project_image: z.any().optional(),
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
    .superRefine((d, ctx) => {
      if (d.start_date && d.end_date && d.start_date > d.end_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["end_date"],
          message: messages.dateOrder,
        });
      }

      const contacts = d.contacts ?? [];
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

export type ProjectFormValues = z.infer<ReturnType<typeof createProjectFormSchema>>;
