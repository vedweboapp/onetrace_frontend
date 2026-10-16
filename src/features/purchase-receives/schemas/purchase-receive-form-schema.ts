import { z } from "zod";

export type PurchaseReceiveFormMessages = {
  vendor: string;
  receiveDate: string;
  status: string;
  lineItem: string;
  receivedQuantity: string;
};

const optionalId = z.string();

const lineItemShape = z.object({
  id: z.string(),
  item: z.string().trim().min(1),
  item_name: z.string(),
  group: z.string(),
  ordered_quantity: z.string(),
  received_quantity: z.string().trim().min(1),
  billed_quantity: z.string(),
  unit_price: z.string(),
});

export function createPurchaseReceiveFormSchema(messages: PurchaseReceiveFormMessages) {
  return z
    .object({
      purchase_receive_number: z.string(),
      receive_date: z.string().trim().min(1, { message: messages.receiveDate }),
      tracking_number: z.string(),
      tracking_link: z.string(),
      notes: z.string(),
      status: z.string().trim().min(1, { message: messages.status }),
      vendor: z
        .string()
        .trim()
        .min(1, { message: messages.vendor })
        .refine((v) => /^\d+$/.test(v) && Number.parseInt(v, 10) > 0, { message: messages.vendor }),
      purchase_order: optionalId,
      line_items: z.array(lineItemShape).min(1, { message: messages.lineItem }),
    })
    .superRefine((values, ctx) => {
      values.line_items.forEach((row, index) => {
        if (!/^\d+$/.test(row.item.trim()) || Number.parseInt(row.item.trim(), 10) <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.lineItem,
            path: ["line_items", index, "item"],
          });
        }
        const qty = Number.parseFloat(row.received_quantity.replace(/,/g, ""));
        if (!Number.isFinite(qty) || qty < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.receivedQuantity,
            path: ["line_items", index, "received_quantity"],
          });
        }
      });
    });
}

export type PurchaseReceiveFormValues = z.infer<ReturnType<typeof createPurchaseReceiveFormSchema>>;
