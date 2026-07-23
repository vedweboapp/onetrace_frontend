import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input/min";
import { zTrimmedNonEmpty } from "@/shared/form";
import {
  createEntityAddressesArraySchema,
  type EntityAddressFormMessages,
} from "@/shared/form/entity-address-form.util";

export type ClientFormMessages = {
  name: string;
  email: string;
  phoneInvalid: string;
} & EntityAddressFormMessages;

export function createClientFormSchema(messages: ClientFormMessages) {
  return z.object({
    name: zTrimmedNonEmpty(messages.name),
    email: z.string().trim().email(messages.email),
    phone: z.string().refine((val) => isValidPhoneNumber(val), {
      message: messages.phoneInvalid,
    }),
    addresses: createEntityAddressesArraySchema(messages),
  });
}

export type ClientFormSchema = ReturnType<typeof createClientFormSchema>;
export type ClientFormValues = z.infer<ClientFormSchema>;
