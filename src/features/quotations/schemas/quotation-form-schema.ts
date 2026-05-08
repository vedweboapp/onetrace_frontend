import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";

export type QuotationFormMessages = {
  quoteName: string;
  customer: string;
  site: string;
  project: string;
};

export function createQuotationFormSchema(messages: QuotationFormMessages) {
  const idString = (msg: string) =>
    z
      .string()
      .trim()
      .regex(/^\d+$/, msg)
      .refine((s) => Number.parseInt(s, 10) > 0, { message: msg });

  return z.object({
    quote_name: zTrimmedNonEmpty(messages.quoteName),
    customer: idString(messages.customer),
    site: idString(messages.site),
    project: idString(messages.project),
    primary_customer_contact: z.string(),
    additional_customer_contact: z.string(),
    site_contact: z.string(),
    tags_raw: z.string(),
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
