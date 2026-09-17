import { City, State } from "country-state-city";
import { z } from "zod";
import { zTrimmedNonEmpty } from "@/shared/form";

export type AddressValidationMessages = {
  addressLine1: string;
  country: string;
  state: string;
  city: string;
};

export type AddressFieldValues = {
  address_line_1: string;
  address_line_2: string;
  country_iso: string;
  state_iso: string;
  city: string;
  pincode: string;
};

export function addressFieldsZodShape(messages: AddressValidationMessages) {
  return z.object({
    address_line_1: zTrimmedNonEmpty(messages.addressLine1),
    address_line_2: z.string(),
    country_iso: z
      .string()
      .trim()
      .min(1, { message: messages.country })
      .refine((v) => /^[A-Za-z]{2}$/i.test(v), { message: messages.country })
      .transform((s) => s.toUpperCase()),
    state_iso: z.string(),
    city: z.string(),
    pincode: z.string(),
  });
}

export function addAddressLocationRefinements(
  data: Pick<AddressFieldValues, "country_iso" | "state_iso" | "city">,
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[],
  messages: AddressValidationMessages,
) {
  const countryIso = (data.country_iso ?? "").trim().toUpperCase();
  if (!countryIso || !/^[A-Z]{2}$/.test(countryIso)) return;

  const subdivisions = State.getStatesOfCountry(countryIso);
  if (subdivisions.length > 0 && !data.state_iso?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...pathPrefix, "state_iso"],
      message: messages.state,
    });
  }

  const stateTrimmed = data.state_iso?.trim() ?? "";
  const cities =
    subdivisions.length > 0 && stateTrimmed
      ? City.getCitiesOfState(countryIso, stateTrimmed)
      : [];

  if (cities.length > 0 && !data.city?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...pathPrefix, "city"],
      message: messages.city,
    });
  }
}
