import { z } from "zod";
import { isAppValidPhoneNumber } from "@/shared/utils/phone-input.util";
import { zEmail, zRequiredName, zTrimmedNonEmpty } from "@/shared/form";
import {
  createEntityAddressesArraySchema,
  type EntityAddressFormMessages,
} from "@/shared/form/entity-address-form.util";

export type ContactFormMessages = {
  firstName: string;
  lastName: string;
  email: string;
  phoneInvalid: string;
  contactType: string;
  client: string;
  vendor: string;
} & EntityAddressFormMessages;

const parentIdField = (message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, message)
    .refine((s) => Number.parseInt(s, 10) > 0, { message });

export function createContactFormSchema(messages: ContactFormMessages) {
  return z
    .object({
      contact_type: z.enum(["client", "vendor"], { message: messages.contactType }),
      first_name: zRequiredName(messages.firstName),
      last_name: zRequiredName(messages.lastName),
      email: zEmail(messages.email),
      phone: z.string().refine((val) => isAppValidPhoneNumber(val), {
        message: messages.phoneInvalid,
      }),
      client: z.string(),
      vendor: z.string(),
      addresses: createEntityAddressesArraySchema(messages),
    })
    .superRefine((data, ctx) => {
      if (data.contact_type === "client") {
        const parsed = parentIdField(messages.client).safeParse(data.client);
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            ctx.addIssue({ ...issue, path: ["client"] });
          }
        }
      } else {
        const parsed = parentIdField(messages.vendor).safeParse(data.vendor);
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            ctx.addIssue({ ...issue, path: ["vendor"] });
          }
        }
      }
    });
}

export type ContactFormSchema = ReturnType<typeof createContactFormSchema>;
export type ContactFormValues = z.infer<ContactFormSchema>;
