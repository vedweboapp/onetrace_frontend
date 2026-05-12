import { z } from "zod";
import { City, State } from "country-state-city";
import { zTrimmedNonEmpty } from "@/shared/form";

export type ContactFormMessages = {
  name: string;
  email: string;
  phone: string;
  client: string;
  addressLine1: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
};

export function createContactFormSchema(messages: ContactFormMessages) {
  return z
    .object({
      name: zTrimmedNonEmpty(messages.name),
      email: z.string().trim().email(messages.email),
      phone: zTrimmedNonEmpty(messages.phone),
      client: z
        .string()
        .trim()
        .regex(/^\d+$/, messages.client)
        .refine((s) => Number.parseInt(s, 10) > 0, { message: messages.client }),
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
