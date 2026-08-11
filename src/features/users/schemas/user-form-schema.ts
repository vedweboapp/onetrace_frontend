import { z } from "zod";
import { isAppValidPhoneNumber } from "@/shared/utils/phone-input.util";
import { zEmail, zRequiredName } from "@/shared/form";
import {
  createEntityAddressesArraySchema,
  type EntityAddressFormMessages,
} from "@/shared/form/entity-address-form.util";

export type UserBasePayType = "fixed_amount" | "rate_per_hr";

export type UserFormMessages = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  role: string;
  basePay: string;
} & EntityAddressFormMessages;

export function createUserFormSchema(messages: UserFormMessages) {
  return z.object({
    first_name: zRequiredName(messages.firstName),
    last_name: zRequiredName(messages.lastName),
    email: zEmail(messages.email),
    phone_number: z.string().refine((val) => isAppValidPhoneNumber(val), {
      message: messages.phone,
    }),
    gender: z.string().trim().min(1, messages.gender),
    role: z.string().trim().regex(/^\d+$/, messages.role),
    base_pay: z.string().trim(),
    base_pay_type: z.enum(["fixed_amount", "rate_per_hr"]),
    addresses: createEntityAddressesArraySchema(messages),
  }).superRefine((data, ctx) => {
    if (data.base_pay.trim()) {
      const n = Number(data.base_pay);
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["base_pay"],
          message: messages.basePay,
        });
      }
    }
  });
}

export type UserFormValues = z.infer<ReturnType<typeof createUserFormSchema>>;
