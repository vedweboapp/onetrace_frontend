import type { ApiEnvelope } from "@/core/types/api.types";

export type AuthUser = {
  id: number;
  email: string;
  username: string;
};


export type AuthOrganizationMembership = {
  id?: number;
  organization_id: number;
  organization_name?: string;
};

export type AuthLoginData = {
  access: string;
  organizations: AuthOrganizationMembership[];
  user: AuthUser;
};

export type AuthLoginEnvelope = ApiEnvelope<AuthLoginData>;

export type AuthRefreshData = {
  access: string;
};

export type AuthRefreshEnvelope = ApiEnvelope<AuthRefreshData>;

export type AuthLogoutEnvelope = ApiEnvelope<null>;
