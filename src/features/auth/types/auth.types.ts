import type { ApiEnvelope } from "@/core/types/api.types";

export type AuthUser = {
  id: number;
  email: string;
  username: string;
};


export type AuthOrganizationMembership = {
  id?: number;
  organization_id?: number;
  organization_name?: string;
};

/** Raw shape inside the `data` field of the login API envelope. */
export type AuthLoginRawData = {
  user: AuthUser & {
    access: string;
    organizations: AuthOrganizationMembership[];
  };
};

/**
 * Normalised login data consumed by the rest of the app.
 * Kept backwards-compatible so `useLogin` / auth store don't break.
 */
export type AuthLoginData = {
  access: string;
  organizations: AuthOrganizationMembership[];
  user: AuthUser;
};

export type AuthLoginEnvelope = ApiEnvelope<AuthLoginRawData>;

export type AuthRefreshData = {
  access: string;
};

export type AuthRefreshEnvelope = ApiEnvelope<AuthRefreshData>;

export type AuthLogoutEnvelope = ApiEnvelope<null>;
