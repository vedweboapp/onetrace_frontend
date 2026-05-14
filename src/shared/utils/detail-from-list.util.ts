/** Build list/detail URLs so returning from a detail view restores list query state and highlights the row. */

export function mergeUrlQueryParam(pathWithOptionalQuery: string, key: string, value: string): string {
  const qIdx = pathWithOptionalQuery.indexOf("?");
  const pathOnly = qIdx >= 0 ? pathWithOptionalQuery.slice(0, qIdx) : pathWithOptionalQuery;
  const params = new URLSearchParams(qIdx >= 0 ? pathWithOptionalQuery.slice(qIdx + 1) : "");
  params.set(key, value);
  const s = params.toString();
  return s ? `${pathOnly}?${s}` : pathOnly;
}

/** `detailPath` e.g. `/en/dashboard/clients/12`; `currentListHref` full list URL incl. query. */
export function buildDetailHrefWithListReturn(detailPath: string, currentListHref: string, entityId: number): string {
  const backTarget = mergeUrlQueryParam(currentListHref, "highlight", String(entityId));
  return `${detailPath}?back=${encodeURIComponent(backTarget)}`;
}

export type DashboardListSection =
  | "clients"
  | "contacts"
  | "sites"
  | "quotations"
  | "projects"
  | "groups"
  | "items"
  | "composite-items"
  | "settings/users";

export function sanitizeInternalListBack(
  raw: string | null | undefined,
  section: DashboardListSection,
): string | null {
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
  const needle = `/dashboard/${section}`;
  if (!decoded.includes(needle)) return null;
  return decoded;
}
