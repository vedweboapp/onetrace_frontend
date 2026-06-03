import { z } from "zod";
import {
  addAddressLocationRefinements,
  addressFieldsZodShape,
  type AddressValidationMessages,
} from "@/shared/utils/address-form-validation.util";

export type InvoiceFormMessages = AddressValidationMessages & {
  client: string;
  issueDate: string;
  lineDescription: string;
  lineQuantity: string;
};

const optionalId = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number.parseInt(v, 10) > 0), { message });

const lineItemShape = z.object({
  id: z.string(),
  group: z.string(),
  group_name: z.string(),
  item: z.string(),
  item_name: z.string(),
  quantity: z.string(),
  rate: z.string(),
});

export function createInvoiceFormSchema(messages: InvoiceFormMessages) {
  const addressShape = addressFieldsZodShape(messages);

  return z
    .object({
      client: z
        .string()
        .trim()
        .min(1, { message: messages.client })
        .refine((v) => /^\d+$/.test(v) && Number.parseInt(v, 10) > 0, { message: messages.client }),
      contact: optionalId(messages.client),
      project: optionalId(messages.client),
      due_date: z.string(),
      payment_terms: z.string(),
      bill_to: addressShape,
      ship_to: addressShape,
      client_notes: z.string(),
      internal_notes: z.string(),
      line_items: z.array(lineItemShape).min(1, { message: messages.lineDescription }),
    })
    .superRefine((data, ctx) => {
      addAddressLocationRefinements(data.bill_to, ctx, ["bill_to"], messages);
      addAddressLocationRefinements(data.ship_to, ctx, ["ship_to"], messages);

      data.line_items.forEach((row, index) => {
        const item = row.item.trim();
        if (!item) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["line_items", index, "item"],
            message: messages.lineDescription,
          });
        }
        const qty = Number.parseFloat(row.quantity.trim());
        if (!Number.isFinite(qty) || qty <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["line_items", index, "quantity"],
            message: messages.lineQuantity,
          });
        }
      });
    });
}

export type InvoiceFormValues = z.infer<ReturnType<typeof createInvoiceFormSchema>>;

export type InvoiceFormLineItem = InvoiceFormValues["line_items"][number];
