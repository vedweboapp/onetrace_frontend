import { z } from "zod";
import { isAppValidPhoneNumber } from "@/shared/utils/phone-input.util";
import { zEmail, zRequiredName } from "@/shared/form";
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
    name: zRequiredName(messages.name),
    email: zEmail(messages.email),
    phone: z.string().refine((val) => isAppValidPhoneNumber(val), {
      message: messages.phoneInvalid,
    }),
    addresses: createEntityAddressesArraySchema(messages),
  });
}

export type ClientFormSchema = ReturnType<typeof createClientFormSchema>;
export type ClientFormValues = z.infer<ClientFormSchema>;
