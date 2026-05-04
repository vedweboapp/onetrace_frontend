import type { ApiEnvelope } from "@/shared/api/types";

export type AuthUser = {
  id: number;
  email: string;
  username: string;
};

export type AuthLoginData = {
  access: string;
  organizations: unknown[];
  user: AuthUser;
};

export type AuthLoginEnvelope = ApiEnvelope<AuthLoginData>;

export type AuthRefreshData = {
  access: string;
};

export type AuthRefreshEnvelope = ApiEnvelope<AuthRefreshData>;

export type AuthLogoutEnvelope = ApiEnvelope<null>;
