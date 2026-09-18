import { ZOHO_RESOURCES, type ZohoResource } from "@/features/settings/integrations/api/integration.paths";
import type {
  ZohoSyncHistoryEntry,
  ZohoSyncHistoryEventLogDetails,
  ZohoSyncHistorySyncJobDetails,
} from "@/features/settings/integrations/types/integration.types";

export function isZohoSyncJobDetails(
  entry: ZohoSyncHistoryEntry,
): entry is ZohoSyncHistoryEntry & { details: ZohoSyncHistorySyncJobDetails } {
  return entry.details_type === "sync_job" && entry.details != null && typeof entry.details === "object";
}

export function isZohoEventLogDetails(
  entry: ZohoSyncHistoryEntry,
): entry is ZohoSyncHistoryEntry & { details: ZohoSyncHistoryEventLogDetails } {
  return entry.details_type === "event_log" && entry.details != null && typeof entry.details === "object";
}

export function zohoSyncHistoryStatus(entry: ZohoSyncHistoryEntry): string | null {
  if (!entry.details || typeof entry.details !== "object") return null;
  const status = (entry.details as { status?: unknown }).status;
  return typeof status === "string" && status.trim() ? status.trim() : null;
}

export function zohoSyncHistoryResource(entry: ZohoSyncHistoryEntry): string | null {
  if (entry.resource?.trim()) return entry.resource.trim();
  if (isZohoSyncJobDetails(entry) && entry.details.resource?.trim()) {
    return entry.details.resource.trim();
  }
  return null;
}

export function zohoSyncJobId(entry: ZohoSyncHistoryEntry): number | null {
  if (!isZohoSyncJobDetails(entry)) return null;
  const id = entry.details.id;
  return typeof id === "number" && Number.isFinite(id) && id > 0 ? id : null;
}

export function canRetryZohoSyncHistory(entry: ZohoSyncHistoryEntry): boolean {
  if (entry.details_type !== "sync_job") return false;
  if (zohoSyncJobId(entry) == null) return false;
  const status = (zohoSyncHistoryStatus(entry) ?? "").toLowerCase();
  const failedCount = entry.failed_record_count ?? 0;
  if (failedCount > 0) return true;
  return (
    status.includes("fail") ||
    status.includes("partial") ||
    status === "partially_succeeded" ||
    status === "completed_with_errors"
  );
}

export function formatZohoSyncDuration(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) {
    const raw = String(value).trim();
    return raw || null;
  }
  if (n < 60) return `${n.toFixed(n < 10 ? 1 : 0)}s`;
  const mins = Math.floor(n / 60);
  const secs = Math.round(n % 60);
  return `${mins}m ${secs}s`;
}

/** Friendly labels for payload item names when present. */
export function zohoEventPayloadSummary(details: ZohoSyncHistoryEventLogDetails): string[] {
  const payload = details.payload;
  if (!payload || typeof payload !== "object") return [];
  const lines: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (!Array.isArray(value)) continue;
    for (const row of value) {
      if (!row || typeof row !== "object") continue;
      const obj = row as Record<string, unknown>;
      const name =
        (typeof obj.item_name === "string" && obj.item_name.trim()) ||
        (typeof obj.name === "string" && obj.name.trim()) ||
        (typeof obj.customer_name === "string" && obj.customer_name.trim()) ||
        (typeof obj.vendor_name === "string" && obj.vendor_name.trim()) ||
        null;
      const id =
        (typeof obj.item_id === "string" && obj.item_id.trim()) ||
        (typeof obj.id === "string" && obj.id.trim()) ||
        (typeof obj.id === "number" ? String(obj.id) : null);
      if (name && id) lines.push(`${name} (${id})`);
      else if (name) lines.push(name);
      else if (id) lines.push(`${key} #${id}`);
    }
  }
  return lines.slice(0, 8);
}

function isZohoResource(value: string): value is ZohoResource {
  return (ZOHO_RESOURCES as readonly string[]).includes(value);
}

export function zohoSyncResourceDisplayLabel(
  resource: string | null,
  tResources: (key: `${ZohoResource}.title`) => string,
  fallback: string,
): string {
  if (!resource?.trim()) return fallback;
  const key = resource.trim();
  if (isZohoResource(key)) return tResources(`${key}.title`);
  return key.replace(/_/g, " ");
}
