import { z } from "zod";

export type AuthValidationMessageKey =
  | "emailRequired"
  | "emailInvalid"
  | "passwordRequired";

export const loginSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
  password: z.string().min(1, "passwordRequired"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
