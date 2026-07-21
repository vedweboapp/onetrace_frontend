import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";

export type QuotationFormMessages = {
  quoteName: string;
  customer: string;
  sites: string;
  project: string;
};

export function createQuotationFormSchema(
  messages: QuotationFormMessages,
  options?: { requireProject?: boolean },
) {
  const requireProject = options?.requireProject !== false;
  const idString = (msg: string) =>
    z
      .string()
      .trim()
      .regex(/^\d+$/, msg)
      .refine((s) => Number.parseInt(s, 10) > 0, { message: msg });

  return z.object({
    quote_name: zTrimmedNonEmpty(messages.quoteName),
    customer: idString(messages.customer),
    sites: z.array(idString(messages.sites)).min(1, { message: messages.sites }),
    /** Required for project quotations; empty string allowed for service quotations. */
    project: requireProject ? idString(messages.project) : z.string(),
    primary_customer_contact: z.string(),
    additional_customer_contacts: z.array(
      z.object({
        contact: z.string(),
      }),
    ),
    site_contact: z.string(),
    tags_raw: z.string(),
    tag_ids: z.array(z.number()),
    order_number: z.string(),
    due_date: z.string(),
    salesperson: z.string(),
    project_manager: z.string(),
    technician_ids: z.array(z.number()),
    description: z.string(),
    select_all_levels: z.boolean(),
    level_ids: z.array(z.number()),
  });
}

export type QuotationFormSchema = ReturnType<typeof createQuotationFormSchema>;
export type QuotationFormValues = z.infer<QuotationFormSchema>;
