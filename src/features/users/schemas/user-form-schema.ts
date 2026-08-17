import { z } from "zod";
import { isAppValidPhoneNumber } from "@/shared/utils/phone-input.util";
import { zEmail, zRequiredName } from "@/shared/form";
import {
  createEntityAddressesArraySchema,
  type EntityAddressFormMessages,
} from "@/shared/form/entity-address-form.util";
import { USER_AVAILABILITY_DAYS } from "@/features/users/types/user-availability.types";

export type UserBasePayType = "fixed_amount" | "rate_per_hr";

export type UserFormMessages = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  role: string;
  basePay: string;
  availabilityTime: string;
  availabilityRange: string;
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
    date_of_birth: z.string().optional(),
    email_record_id: z.number().int().positive().optional(),
    phone_record_id: z.number().int().positive().optional(),
    base_pay: z.string().trim(),
    base_pay_type: z.enum(["fixed_amount", "rate_per_hr"]),
    available_days: z.array(
      z.object({
        day: z.enum(USER_AVAILABILITY_DAYS),
        enabled: z.boolean(),
        start_time: z.string().trim(),
        end_time: z.string().trim(),
      }),
    ),
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
    data.available_days.forEach((row, index) => {
      if (!row.enabled) return;
      if (!row.start_time.trim() || !row.end_time.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["available_days", index, "start_time"],
          message: messages.availabilityTime,
        });
        return;
      }
      if (row.start_time >= row.end_time) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["available_days", index, "end_time"],
          message: messages.availabilityRange,
        });
      }
    });
  });
}

export type UserFormValues = z.infer<ReturnType<typeof createUserFormSchema>>;
