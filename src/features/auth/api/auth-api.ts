import api from "@/lib/axios";
import { assertApiSuccess } from "@/shared/api/types";
import { AUTH_API_PATHS } from "./auth-paths";
import type {
  AuthLoginData,
  AuthLoginEnvelope,
  AuthLogoutEnvelope,
} from "./types";

export type LoginRequest = {
  email: string;
  password: string;
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
