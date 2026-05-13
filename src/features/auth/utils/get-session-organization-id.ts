import type { AuthOrganizationMembership } from "../types/auth.types";

function asMembership(row: unknown): AuthOrganizationMembership | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const raw = o.organization_id ?? o.organizationId;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return {
      id: typeof o.id === "number" ? o.id : undefined,
      organization_id: raw,
      organization_name: typeof o.organization_name === "string" ? o.organization_name : undefined,
    };
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) {
      return {
        organization_id: n,
        organization_name: typeof o.organization_name === "string" ? o.organization_name : undefined,
      };
    }
  }
  return null;
}

/** Uses the first membership row from login (`organizations[].organization_id`). */
export function getSessionOrganizationId(organizations: unknown[]): number | null {
  if (!Array.isArray(organizations) || organizations.length === 0) return null;
  const m = asMembership(organizations[0]);
  return m?.organization_id ?? null;
}
