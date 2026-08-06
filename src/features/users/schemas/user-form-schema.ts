import { z } from "zod";
import { City, State } from "country-state-city";
import { isAppValidPhoneNumber } from "@/shared/utils/phone-input.util";
import { zEmail, zRequiredName } from "@/shared/form";

export function createUserFormSchema(messages: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  role: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
}) {
  return z
    .object({
      first_name: zRequiredName(messages.firstName),
      last_name: zRequiredName(messages.lastName),
      email: zEmail(messages.email),
      phone_number: z.string().refine((val) => isAppValidPhoneNumber(val), {
        message: messages.phone,
      }),
      gender: z.string().trim().min(1, messages.gender),
      role: z.string().trim().regex(/^\d+$/, messages.role),
      address1: z.string().trim(),
      address2: z.string().trim(),
      country_iso: z
        .string()
        .trim()
        .length(2, { message: messages.country })
        .regex(/^[A-Za-z]{2}$/, { message: messages.country })
        .transform((s) => s.toUpperCase()),
      state_iso: z.string(),
      city: z.string(),
      pincode: z.string().trim().min(1, messages.pincode),
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

export type UserFormValues = z.infer<ReturnType<typeof createUserFormSchema>>;
