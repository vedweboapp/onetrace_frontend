import { z } from "zod";
import { City, State } from "country-state-city";
import { isAppValidPhoneNumber } from "@/shared/utils/phone-input.util";
import { zEmail, zRequiredName, zTrimmedNonEmpty } from "@/shared/form";

export type ContactFormMessages = {
  name: string;
  email: string;
  phoneInvalid: string;
  contactType: string;
  client: string;
  vendor: string;
  addressLine1: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
};

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
      name: zRequiredName(messages.name),
      email: zEmail(messages.email),
      phone: z.string().refine((val) => isAppValidPhoneNumber(val), {
        message: messages.phoneInvalid,
      }),
      client: z.string(),
      vendor: z.string(),
      address_line_1: zTrimmedNonEmpty(messages.addressLine1),
      address_line_2: z.string(),
      country_iso: z
        .string()
        .trim()
        .length(2, { message: messages.country })
        .regex(/^[A-Za-z]{2}$/, { message: messages.country })
        .transform((s) => s.toUpperCase()),
      state_iso: z.string(),
      city: z.string(),
      pincode: zTrimmedNonEmpty(messages.pincode),
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

      const subdivisions = State.getStatesOfCountry(data.country_iso);
      if (subdivisions.length > 0 && !data.state_iso?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["state_iso"], message: messages.state });
      }
      const stateTrimmed = data.state_iso?.trim() ?? "";
      const cities =
        subdivisions.length > 0 && stateTrimmed
          ? City.getCitiesOfState(data.country_iso, stateTrimmed)
          : [];
      if (cities.length > 0 && !data.city?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["city"], message: messages.city });
      }
    });
}

export type ContactFormSchema = ReturnType<typeof createContactFormSchema>;
export type ContactFormValues = z.infer<ContactFormSchema>;
