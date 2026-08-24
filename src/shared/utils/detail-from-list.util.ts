import { routes } from "@/shared/config/routes";

export function mergeUrlQueryParam(pathWithOptionalQuery: string, key: string, value: string): string {
  const qIdx = pathWithOptionalQuery.indexOf("?");
  const pathOnly = qIdx >= 0 ? pathWithOptionalQuery.slice(0, qIdx) : pathWithOptionalQuery;
  const params = new URLSearchParams(qIdx >= 0 ? pathWithOptionalQuery.slice(qIdx + 1) : "");
  params.set(key, value);
  const s = params.toString();
  return s ? `${pathOnly}?${s}` : pathOnly;
}

const BACK_HREF_STORAGE_PREFIX = "onetrace:back:";

function pathKeyForBackStorage(path: string): string {
  const withoutHash = path.split("#")[0] ?? path;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  return `${BACK_HREF_STORAGE_PREFIX}${withoutQuery}`;
}

export function pathWithoutQueryAndHash(path: string): string {
  const withoutHash = path.split("#")[0] ?? path;
  return withoutHash.split("?")[0] ?? withoutHash;
}

/** Persists return URL for a destination path (session-only; not shown in the address bar). */
export function storeBackHrefForPath(destinationPath: string, backHref: string): void {
  if (typeof window === "undefined") return;
  const safe = backHref.trim();
  if (!safe) return;
  try {
    sessionStorage.setItem(pathKeyForBackStorage(destinationPath), safe);
  } catch {
    /* quota / private mode */
  }
}

export function readBackHrefForPath(destinationPath: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(pathKeyForBackStorage(destinationPath));
  } catch {
    return null;
  }
}

/** Navigate to `destinationPath` and remember `backHref` for the back button (sessionStorage, not `?back=`). */
export function buildPathWithStoredBack(destinationPath: string, backHref: string): string {
  storeBackHrefForPath(destinationPath, backHref);
  // Keep intentional query params (e.g. quote_category, project, tab); drop hash only.
  return destinationPath.split("#")[0] ?? destinationPath;
}

export function buildDetailHrefWithListReturn(detailPath: string, currentListHref: string, entityId: number): string {
  const backTarget = mergeUrlQueryParam(currentListHref, "highlight", String(entityId));
  return buildPathWithStoredBack(detailPath, backTarget);
}

/** After create/update, open the entity detail page; back button returns to the list (or prior URL). */
export function buildEntityDetailHrefAfterSave(
  entityListPath: string,
  entityId: number,
  listBackHref?: string | null,
): string {
  const detailPath = `${entityListPath}/${entityId}`;
  let listBack = (listBackHref?.trim() || entityListPath).split("#")[0] ?? entityListPath;
  const listBackPath = pathWithoutQueryAndHash(listBack);

  // Edit forms store the detail page as back; after save, restore the detail page's prior back (usually the list).
  if (listBackPath === detailPath) {
    const priorBack = readBackHrefForPath(detailPath);
    listBack = priorBack?.trim()
      ? (priorBack.split("#")[0] ?? priorBack)
      : entityListPath;
  } else if (listBackPath.endsWith("/new") || /\/\d+\/edit$/.test(listBackPath)) {
    // Never send the detail back-arrow to a create/edit form.
    listBack = entityListPath;
  }

  return buildPathWithStoredBack(detailPath, listBack);
}

/** @deprecated Use {@link buildPathWithStoredBack} */
export const buildFormHrefWithBack = buildPathWithStoredBack;

export type DashboardListSection =
  | "clients"
  | "vendors"
  | "contacts"
  | "sites"
  | "quotations"
  | "invoices"
  | "purchase-orders"
  | "jobs"
  | "qr-codes"
  | "projects"
  | "groups"
  | "items"
  | "composite-items"
  | "material-requests"
  | "dispatches"
  | "return-to-stock"
  | "settings/users"
  | "settings/user-groups"
  | "settings/roles"
  | "settings/profiles";

function decodeInternalDashboardPath(raw: string | null | undefined): string | null {
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
  return decoded;
}

export function sanitizeInternalListBack(
  raw: string | null | undefined,
  section: DashboardListSection,
): string | null {
  const decoded = decodeInternalDashboardPath(raw);
  if (!decoded) return null;
  const needle = `/${section}`;
  if (!decoded.includes(needle)) return null;
  return decoded;
}

const PROJECT_DETAIL_BACK = /^\/projects\/\d+(\?[^#]*)?$/;
const SCHEDULING_BACK = /^\/scheduling(\?[^#]*)?$/;

/** Jobs list, scheduling, or project detail — used when leaving job create/edit/detail. */
export function sanitizeJobsBackHref(raw: string | null | undefined, fallback: string): string {
  const fromJobsList = sanitizeInternalListBack(raw, "jobs");
  if (fromJobsList) return fromJobsList;

  const decoded = decodeInternalDashboardPath(raw);
  if (!decoded) return fallback;

  const pathAndQuery = decoded.split("#")[0] ?? decoded;
  if (PROJECT_DETAIL_BACK.test(pathAndQuery) || SCHEDULING_BACK.test(pathAndQuery)) return decoded;

  // Any other valid in-app path (e.g. another entity detail page).
  return decoded;
}

/** Quotes list or the originating project overview — used when leaving quotation detail. */
export function sanitizeQuotationsBackHref(raw: string | null | undefined, fallback: string): string {
  const fromQuotesList = sanitizeInternalListBack(raw, "quotations");
  if (fromQuotesList) return fromQuotesList;

  const decoded = decodeInternalDashboardPath(raw);
  if (!decoded) return fallback;

  const pathAndQuery = decoded.split("#")[0] ?? decoded;
  if (PROJECT_DETAIL_BACK.test(pathAndQuery)) return decoded;

  return decoded;
}

export function buildProjectOverviewHref(projectId: number): string {
  return `${routes.dashboard.projects}/${projectId}?tab=details`;
}

export function buildProjectJobsTabHref(projectPathname: string): string {
  const qIdx = projectPathname.indexOf("?");
  const pathOnly = qIdx >= 0 ? projectPathname.slice(0, qIdx) : projectPathname;
  const params = new URLSearchParams(qIdx >= 0 ? projectPathname.slice(qIdx + 1) : "");
  params.set("tab", "jobs");
  const qs = params.toString();
  return qs ? `${pathOnly}?${qs}` : `${pathOnly}?tab=jobs`;
}

/** Current page URL (path + query) — use as back target for detail → edit (one step back). */
export function buildCurrentPageBackHref(
  pathname: string,
  searchParams?: { toString(): string } | null,
): string {
  const qs = searchParams?.toString().trim();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Parent entity detail URL with a specific tab active (nested list → child detail back links). */
export function buildEntityDetailTabBackHref(
  pathname: string,
  tab: string,
  searchParams?: { toString(): string } | null,
): string {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  params.set("tab", tab);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : `${pathname}?tab=${tab}`;
}

/** Entity detail → edit, keeping nav context query params (e.g. contact_type, job_category). */
export function buildEntityEditHrefFromDetail(
  pathname: string,
  searchParams?: { toString(): string } | null,
): string {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  params.delete("highlight");
  params.delete("back");
  params.delete("select");
  params.delete("selectTarget");
  const qs = params.toString();
  return qs ? `${pathname}/edit?${qs}` : `${pathname}/edit`;
}

/** Project detail with a specific tab (and optional row highlight after create). */
export function buildProjectDetailTabHref(
  projectId: number,
  tab: string,
  highlightId?: number,
): string {
  let href = mergeUrlQueryParam(`${routes.dashboard.projects}/${projectId}`, "tab", tab);
  if (highlightId != null && highlightId > 0) {
    href = mergeUrlQueryParam(href, "highlight", String(highlightId));
  }
  return href;
}
