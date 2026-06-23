export function mergeUrlQueryParam(pathWithOptionalQuery: string, key: string, value: string): string {
  const qIdx = pathWithOptionalQuery.indexOf("?");
  const pathOnly = qIdx >= 0 ? pathWithOptionalQuery.slice(0, qIdx) : pathWithOptionalQuery;
  const params = new URLSearchParams(qIdx >= 0 ? pathWithOptionalQuery.slice(qIdx + 1) : "");
  params.set(key, value);
  const s = params.toString();
  return s ? `${pathOnly}?${s}` : pathOnly;
}

export function buildDetailHrefWithListReturn(detailPath: string, currentListHref: string, entityId: number): string {
  const backTarget = mergeUrlQueryParam(currentListHref, "highlight", String(entityId));
  return `${detailPath}?back=${encodeURIComponent(backTarget)}`;
}

/** After create/update, open the entity detail page; back button returns to the list (or prior `back` URL). */
export function buildEntityDetailHrefAfterSave(
  entityListPath: string,
  entityId: number,
  listBackHref?: string | null,
): string {
  const listBack = (listBackHref?.trim() || entityListPath).split("#")[0] ?? entityListPath;
  return `${entityListPath}/${entityId}?back=${encodeURIComponent(listBack)}`;
}

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
  | "settings/users";

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

/** Jobs list or project detail (jobs tab) — used when leaving job create/edit/detail. */
export function sanitizeJobsBackHref(raw: string | null | undefined, fallback: string): string {
  const fromJobsList = sanitizeInternalListBack(raw, "jobs");
  if (fromJobsList) return fromJobsList;

  const decoded = decodeInternalDashboardPath(raw);
  if (!decoded) return fallback;

  const pathAndQuery = decoded.split("#")[0] ?? decoded;
  if (!PROJECT_DETAIL_BACK.test(pathAndQuery)) return fallback;

  return decoded;
}

export function buildProjectJobsTabHref(projectPathname: string): string {
  const qIdx = projectPathname.indexOf("?");
  const pathOnly = qIdx >= 0 ? projectPathname.slice(0, qIdx) : projectPathname;
  const params = new URLSearchParams(qIdx >= 0 ? projectPathname.slice(qIdx + 1) : "");
  params.set("tab", "jobs");
  const qs = params.toString();
  return qs ? `${pathOnly}?${qs}` : `${pathOnly}?tab=jobs`;
}
