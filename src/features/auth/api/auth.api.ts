
import { assertApiSuccess } from "@/core/types/api.types";
import { AUTH_API_PATHS } from "./auth.paths";
import type {
  AuthLoginData,
  AuthLoginEnvelope,
  AuthLogoutEnvelope,
} from "../types/auth.types";
import api from "@/core/api/axios";

export type LoginRequest = {
  email: string;
  password: string;
};

export type OtpRequestBody = {
  email: string;
};

export type OtpVerifyBody = {
  email: string;
  otp: string;
};

export type ForgotOtpRequestBody = {
  email: string;
};

export type PasswordResetConfirmBody = {
  token: string;
  new_password: string;
  confirm_password: string;
};

export { AUTH_API_PATHS };

export async function loginRequest(body: LoginRequest): Promise<AuthLoginData> {
  const { data } = await api.post<AuthLoginEnvelope>(AUTH_API_PATHS.login, body);
  assertApiSuccess(data);
  return data.data;
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
  const { data } = await api.post<AuthLogoutEnvelope>(AUTH_API_PATHS.otpRequest, body);
  assertApiSuccess(data);
}

export async function verifyLoginOtp(body: OtpVerifyBody): Promise<AuthLoginData> {
  const { data } = await api.post<AuthLoginEnvelope>(AUTH_API_PATHS.otpVerify, body);
  assertApiSuccess(data);
  return data.data;
}

export async function requestForgotPasswordOtp(body: ForgotOtpRequestBody): Promise<void> {
  const { data } = await api.post<AuthLogoutEnvelope>(AUTH_API_PATHS.forgotOtpRequest, body);
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
