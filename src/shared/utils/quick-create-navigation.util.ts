import type { ContactType } from "@/features/contacts/types/contact.types";
import { routes } from "@/shared/config/routes";
import { isQuickCreateKind, type QuickCreateKind } from "@/shared/types/quick-create.types";
import {
  buildEntityDetailHrefAfterSave,
  mergeUrlQueryParam,
  pathWithoutQueryAndHash,
  readBackHrefForPath,
  sanitizeInternalListBack,
  storeBackHrefForPath,
} from "@/shared/utils/detail-from-list.util";
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
  if (decoded === routes.home) return null;
  if (
    decoded === routes.auth.login ||
    decoded.startsWith(`${routes.auth.login}/`) ||
    decoded === routes.auth.signUp ||
    decoded.startsWith(`${routes.auth.signUp}/`) ||
    decoded === routes.auth.forgotPassword ||
    decoded.startsWith(`${routes.auth.forgotPassword}/`)
  ) {
    return null;
  }
  return decoded;
}

export function resolveFormBackUrl(
  rawBack: string | null | undefined,
  listSection: DashboardListSection,
  fallback: string,
  currentPath?: string | null,
): string {
  const raw = (currentPath ? readBackHrefForPath(currentPath) : null) ?? rawBack;
  return sanitizeInternalListBack(raw, listSection) ?? sanitizeInternalDashboardBack(raw) ?? fallback;
}

export function getQuickCreateNewPath(kind: QuickCreateKind): string {
  switch (kind) {
    case "client":
      return `${routes.dashboard.clients}/new`;
    case "vendor":
      return `${routes.dashboard.vendors}/new`;
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
  const path = getQuickCreateNewPath(kind);
  storeBackHrefForPath(path, args.returnTo);
  const params = new URLSearchParams();
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
  return params.toString() ? `${path}?${params.toString()}` : path;
}

export function buildQuickCreateReturnHref(back: string, createdId: number, selectTarget: QuickCreateKind): string {
  let href = mergeUrlQueryParam(back, QUICK_CREATE_SELECT_PARAM, String(createdId));
  href = mergeUrlQueryParam(href, QUICK_CREATE_SELECT_TARGET_PARAM, selectTarget);
  return href;
}

/**
 * After create: return to the parent (form or entity tab) when launched via quick-create
 * or from a nested parent tab; otherwise open the new entity detail page.
 */
export function hrefAfterEntityCreate(args: {
  createdId: number;
  selectTarget: string | null | undefined;
  backHref: string;
  listPath: string;
}): string {
  if (isQuickCreateKind(args.selectTarget)) {
    return buildQuickCreateReturnHref(args.backHref, args.createdId, args.selectTarget);
  }

  const backPath = pathWithoutQueryAndHash(args.backHref);
  const listPath = pathWithoutQueryAndHash(args.listPath);
  const backIsSameModule = backPath === listPath || backPath.startsWith(`${listPath}/`);
  if (!backIsSameModule && args.backHref.trim()) {
    return mergeUrlQueryParam(args.backHref, "highlight", String(args.createdId));
  }

  return buildEntityDetailHrefAfterSave(args.listPath, args.createdId, args.backHref);
}
