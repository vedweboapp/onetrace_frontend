"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { loginRequest } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { routes } from "@/shared/config/routes";
import type { LoginFormValues } from "@/features/auth/schemas/login-schema";

export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const data = await loginRequest(values);
      setSession({
        accessToken: data.access,
        user: data.user,
        organizations: data.organizations,
      });
      router.push(routes.dashboard.projects);
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  }

  return { submit, isSubmitting };
}
