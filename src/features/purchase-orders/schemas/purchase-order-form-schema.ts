import { z } from "zod";
import {
  addAddressLocationRefinements,
  addressFieldsZodShape,
  type AddressValidationMessages,
} from "@/shared/utils/address-form-validation.util";

export type PurchaseOrderFormMessages = AddressValidationMessages & {
  vendor: string;
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

export function createPurchaseOrderFormSchema(messages: PurchaseOrderFormMessages) {
  const addressShape = addressFieldsZodShape(messages);

  return z
    .object({
      vendor: z
        .string()
        .trim()
        .min(1, { message: messages.vendor })
        .refine((v) => /^\d+$/.test(v) && Number.parseInt(v, 10) > 0, { message: messages.vendor }),
      contact: optionalId(messages.vendor),
      project: optionalId(messages.vendor),
      due_date: z.string(),
      payment_terms: z.string(),
      bill_to: addressShape,
      ship_to: addressShape,
      vendor_notes: z.string(),
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

export type PurchaseOrderFormValues = z.infer<ReturnType<typeof createPurchaseOrderFormSchema>>;
