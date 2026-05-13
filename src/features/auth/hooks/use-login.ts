"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { loginRequest, requestLoginOtp, verifyLoginOtp } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { routes } from "@/shared/config/routes";
import type { LoginFormValues } from "@/features/auth/schemas/login-schema";

export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);

  async function submit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const data = await loginRequest(values);
      setSession({
        accessToken: data.access,
        user: data.user,
        organizations: data.organizations,
      });
      router.push(routes.dashboard.root);
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendOtp(email: string) {
    setIsOtpSubmitting(true);
    try {
      await requestLoginOtp({ email });
    } finally {
      setIsOtpSubmitting(false);
    }
  }

  async function submitOtp(email: string, otp: string) {
    setIsOtpVerifying(true);
    try {
      const data = await verifyLoginOtp({ email, otp });
      setSession({
        accessToken: data.access,
        user: data.user,
        organizations: data.organizations,
      });
      router.push(routes.dashboard.root);
    } finally {
      setIsOtpVerifying(false);
    }
  }

  return { submit, isSubmitting, sendOtp, submitOtp, isOtpSubmitting, isOtpVerifying };
}
