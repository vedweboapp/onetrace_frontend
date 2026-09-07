import { fetchProject } from "@/features/projects/api/project.api";
import type { ProjectSiteRef } from "@/features/projects/types/project.types";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import {
  getQuotationNestedSite,
  getQuotationSiteId,
  getQuotationSiteIds,
} from "@/features/quotations/utils/quotation-nested-fields.util";

export type QuotationSiteOptionRow = { id: number; site_name: string };

function projectSitesToRows(sites: unknown): QuotationSiteOptionRow[] {
  if (!Array.isArray(sites)) return [];
  const rows: QuotationSiteOptionRow[] = [];
  for (const entry of sites) {
    if (typeof entry === "number" && Number.isFinite(entry) && entry > 0) {
      rows.push({ id: entry, site_name: `Site #${entry}` });
      continue;
    }
    if (entry && typeof entry === "object" && typeof (entry as ProjectSiteRef).id === "number") {
      const obj = entry as ProjectSiteRef;
      rows.push({
        id: obj.id,
        site_name: obj.site_name?.trim() || `Site #${obj.id}`,
      });
    }
  }
  return rows;
}

/** Load site rows for quotation dropdowns — service quotes by client, project quotes by project. */
export async function fetchQuotationSiteRows(args: {
  isServiceQuotation: boolean;
  clientId?: number | null;
  projectId?: number | null;
}): Promise<QuotationSiteOptionRow[]> {
  const { isServiceQuotation, clientId, projectId } = args;

  if (isServiceQuotation) {
    if (!clientId || clientId <= 0) return [];
    const { items } = await fetchSitesPage(1, 500, { client: clientId });
    return items.map((row) => ({ id: row.id, site_name: row.site_name }));
  }

  if (!projectId || projectId <= 0) return [];

  try {
    const project = await fetchProject(projectId);
    const fromProject = projectSitesToRows(project.sites);
    if (fromProject.length > 0) return fromProject;
  } catch {
    /* fall through to site list API */
  }

  const { items } = await fetchSitesPage(1, 500, { project: projectId });
  return items.map((row) => ({ id: row.id, site_name: row.site_name }));
}

/** Keep saved site ids visible in edit dropdowns when outside the current filter. */
export function mergeQuotationSiteOptionRows(
  base: QuotationSiteOptionRow[],
  detail: QuotationDetail | null | undefined,
): QuotationSiteOptionRow[] {
  if (!detail) return base;

  const merged = [...base];
  for (const sid of getQuotationSiteIds(detail)) {
    if (merged.some((row) => row.id === sid)) continue;
    const fromList = detail.sites?.find((row) => row.id === sid);
    const nested =
      getQuotationSiteId(detail.site) === sid ? getQuotationNestedSite(detail.site) : null;
    const site_name = fromList?.site_name?.trim() || nested?.site_name?.trim() || `Site #${sid}`;
    merged.unshift({ id: sid, site_name });
  }
  return merged;
}

export function quotationSiteOptionRowsToRecord(
  rows: QuotationSiteOptionRow[],
): Record<number, string> {
  const mapped: Record<number, string> = {};
  for (const row of rows) mapped[row.id] = row.site_name;
  return mapped;
}
