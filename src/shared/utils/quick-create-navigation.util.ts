import type { ContactType } from "@/features/contacts/types/contact.types";
import { routes } from "@/shared/config/routes";
import type { QuickCreateKind } from "@/shared/types/quick-create.types";
import { mergeUrlQueryParam, sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import type { DashboardListSection } from "@/shared/utils/detail-from-list.util";

export const QUICK_CREATE_SELECT_PARAM = "select";
export const QUICK_CREATE_SELECT_TARGET_PARAM = "selectTarget";
export const QUICK_CREATE_CLIENT_PARAM = "client";
export const QUICK_CREATE_VENDOR_PARAM = "vendor";
export const QUICK_CREATE_CONTACT_TYPE_PARAM = "contact_type";

/** Any internal dashboard path (used when returning from cross-entity quick create). */
export function sanitizeInternalDashboardBack(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;
  if (decoded.includes("..")) return null;
  if (!decoded.includes("/dashboard/")) return null;
  return decoded;
}

export function resolveFormBackUrl(
  rawBack: string | null | undefined,
  listSection: DashboardListSection,
  fallback: string,
): string {
  return sanitizeInternalListBack(rawBack, listSection) ?? sanitizeInternalDashboardBack(rawBack) ?? fallback;
}

export function getQuickCreateNewPath(kind: QuickCreateKind): string {
  switch (kind) {
    case "client":
      return `${routes.dashboard.clients}/new`;
    case "contact":
      return `${routes.dashboard.contacts}/new`;
    case "site":
      return `${routes.dashboard.sites}/new`;
    case "project":
      return `${routes.dashboard.projects}/new`;
    case "group":
      return `${routes.dashboard.groups}/new`;
    case "composite-item":
      return `${routes.dashboard.compositeItems}/new`;
    case "item":
      return `${routes.dashboard.items}/new`;
    default:
      return routes.dashboard.root;
  }
}

export function buildQuickCreateNavigateHref(
  kind: QuickCreateKind,
  args: { returnTo: string; clientId?: number; vendorId?: number; contactType?: ContactType },
): string {
  const params = new URLSearchParams();
  params.set("back", args.returnTo);
  params.set(QUICK_CREATE_SELECT_TARGET_PARAM, kind);
  if (args.clientId != null && args.clientId > 0) {
    params.set(QUICK_CREATE_CLIENT_PARAM, String(args.clientId));
  }
  if (args.vendorId != null && args.vendorId > 0) {
    params.set(QUICK_CREATE_VENDOR_PARAM, String(args.vendorId));
  }
  if (args.contactType === "client" || args.contactType === "vendor") {
    params.set(QUICK_CREATE_CONTACT_TYPE_PARAM, args.contactType);
  }
  return `${getQuickCreateNewPath(kind)}?${params.toString()}`;
}

export function buildQuickCreateReturnHref(back: string, createdId: number, selectTarget: QuickCreateKind): string {
  let href = mergeUrlQueryParam(back, QUICK_CREATE_SELECT_PARAM, String(createdId));
  href = mergeUrlQueryParam(href, QUICK_CREATE_SELECT_TARGET_PARAM, selectTarget);
  return href;
}
