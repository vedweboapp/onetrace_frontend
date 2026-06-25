
import { assertApiSuccess } from "@/core/types/api.types";
import { AUTH_API_PATHS } from "./auth.paths";
import type {
  AuthLoginData,
  AuthLoginEnvelope,
  AuthLoginRawData,
  AuthLogoutEnvelope,
} from "../types/auth.types";
import api from "@/core/api/axios";

export type LoginRequest = {
  email: string;
  password: string;
};

/** OTP request purposes — must match backend `purpose` values. */
export const AUTH_OTP_PURPOSE = {
  login: "login",
  passwordReset: "forgot",
} as const;

export type AuthOtpPurpose = (typeof AUTH_OTP_PURPOSE)[keyof typeof AUTH_OTP_PURPOSE];

export type OtpRequestBody = {
  email: string;
  purpose: AuthOtpPurpose;
};

export type OtpVerifyBody = {
  email: string;
  otp: string;
};

export type ForgotOtpRequestBody = {
  email: string;
  purpose: AuthOtpPurpose;
};

export type PasswordResetConfirmBody = {
  token: string;
  new_password: string;
  confirm_password: string;
};
export type sendOtpBody = {
  email: string;
  purpose: string;
}
export type verifyOtpBody = {
  email: string;
  otp: string;
  purpose: string;
}
export type signUpBody = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  otp: string;
  password: string;
  phone_number: string;
}
export { AUTH_API_PATHS };

/**
 * Normalise the inner `data` object from the login envelope into the flat
 * shape consumed by the auth store.
 * Handles both:
 *   - New shape: { access, user: {...}, organizations: [...] }
 *   - Old shape: { user: { access, organizations, ...userFields } }
 */
function normaliseLoginResponse(raw: any): AuthLoginData {
  // New flat shape: access is at the top level
  if (raw?.access) {
    return {
      access: raw.access,
      user: raw.user ?? {},
      organizations: raw.organizations ?? raw.user?.organizations ?? [],
    };
  }
  // Old nested shape: access lives inside user
  const { access, organizations: userOrgs, ...userFields } = raw.user;
  return {
    access,
    user: userFields,
    organizations: userOrgs ?? [],
  };
}

export async function loginRequest(body: LoginRequest): Promise<AuthLoginData> {
  const { data } = await api.post<AuthLoginEnvelope>(AUTH_API_PATHS.login, body);
  assertApiSuccess(data);
  return normaliseLoginResponse(data.data);
}

export async function logoutRequest(): Promise<void> {
  const { data } = await api.post<AuthLogoutEnvelope>(
    AUTH_API_PATHS.logout,
    {},
    { skipErrorToast: true },
  );
  assertApiSuccess(data);
}

export async function requestLoginOtp(body: OtpRequestBody): Promise<void> {
  const { data } = await api.post<AuthLogoutEnvelope>(AUTH_API_PATHS.sendOtp, body);
  assertApiSuccess(data);
}

export async function verifyLoginOtp(body: OtpVerifyBody): Promise<AuthLoginData> {
  const { data } = await api.post<AuthLoginEnvelope>(AUTH_API_PATHS.verifyOtp, { ...body, purpose: "login" });
  assertApiSuccess(data);
  return normaliseLoginResponse(data.data);
}

export async function requestForgotPasswordOtp(body: ForgotOtpRequestBody): Promise<void> {
  const { data } = await api.post<AuthLogoutEnvelope>(AUTH_API_PATHS.sendOtp, body);
  assertApiSuccess(data);
}
export async function sendOtp(body: sendOtpBody): Promise<void> {
  const { data } = await api.post(AUTH_API_PATHS.sendOtp, body);
  assertApiSuccess(data);
}
export async function verifyOtp(body: verifyOtpBody): Promise<void> {
  const { data } = await api.post(AUTH_API_PATHS.verifyOtp, body);
  assertApiSuccess(data);
}
export async function signUpHandler(body: signUpBody): Promise<void> {
  const { data } = await api.post(AUTH_API_PATHS.signUp, body);
  assertApiSuccess(data);
}
export async function resetPasswordConfirm(body: PasswordResetConfirmBody): Promise<void> {
  const { data } = await api.post<AuthLogoutEnvelope>(
    AUTH_API_PATHS.passwordResetConfirm,
    body,
    { skipErrorToast: true },
  );
  assertApiSuccess(data);
}
