import { z } from "zod";

export type ProjectFormMessages = {
  name: string;
  client: string;
  description: string;
  startDate: string;
  endDate: string;
  dateOrder: string;
};

export function createProjectFormSchema(messages: ProjectFormMessages) {
  return z
    .object({
      name: z.string().trim().min(1, messages.name),
      client: z
        .string()
        .trim()
        .regex(/^\d+$/, messages.client)
        .refine((s) => Number.parseInt(s, 10) > 0, { message: messages.client }),
      description: z.string().trim().min(1, messages.description),
      sites: z.array(z.string()).default([]),
      start_date: z.string().trim().min(1, messages.startDate),
      end_date: z.string().trim().min(1, messages.endDate),
    })
    .refine((d) => d.start_date <= d.end_date, {
      message: messages.dateOrder,
      path: ["end_date"],
    });
}

export type ProjectFormValues = z.infer<ReturnType<typeof createProjectFormSchema>>;
