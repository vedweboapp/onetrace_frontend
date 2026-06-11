import { z } from "zod";
import { City, State } from "country-state-city";
import { zTrimmedNonEmpty } from "@/shared/form";

export type VendorFormMessages = {
  name: string;
  email: string;
  phoneInvalid: string;
  type: string;
  addressLine1: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  addressesMin: string;
};

const addressRowSchema = (messages: VendorFormMessages) =>
  z
    .object({
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
      latitude: z.string(),
      longitude: z.string(),
      is_primary: z.boolean(),
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
    addresses: z.array(addressRowSchema(messages)).min(1, messages.addressesMin),
  });
}

export type VendorFormSchema = ReturnType<typeof createVendorFormSchema>;
export type VendorFormValues = z.infer<VendorFormSchema>;
