import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";
import {
  createEntityAddressesArraySchema,
  type EntityAddressFormMessages,
} from "@/shared/form/entity-address-form.util";

export type VendorFormMessages = {
  name: string;
  email: string;
  phoneInvalid: string;
  type: string;
} & EntityAddressFormMessages;

export function createVendorFormSchema(messages: VendorFormMessages) {
  return z.object({
    name: zTrimmedNonEmpty(messages.name),
    email: zTrimmedNonEmpty(messages.email).email(messages.email),
    phone: z.string(),
    type: z
      .string()
      .trim()
      .regex(/^\d+$/, messages.type)
      .refine((s) => Number.parseInt(s, 10) > 0, { message: messages.type }),
    addresses: createEntityAddressesArraySchema(messages),
  });
}

export type VendorFormSchema = ReturnType<typeof createVendorFormSchema>;
export type VendorFormValues = z.infer<VendorFormSchema>;
