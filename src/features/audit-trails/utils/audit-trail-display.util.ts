import type { AuditTrailEntry, AuditTrailUserRef } from "@/features/audit-trails/types/audit-trail.types";
import type { MaterialRequestLogEntry } from "@/features/material-requests/types/material-request.types";

function auditTrailUserLabel(user: AuditTrailUserRef | null | undefined): string | null {
  if (!user) return null;
  const parts = [user.first_name?.trim(), user.last_name?.trim()].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  const username = user.username?.trim();
  if (username) return username;
  const email = user.email?.trim();
  if (email) return email;
  return null;
}

function auditTrailActionLabel(row: AuditTrailEntry): string {
  const raw =
    row.action?.trim() ||
    row.event?.trim() ||
    row.event_type?.trim() ||
    row.title?.trim() ||
    "";
  if (!raw) return "";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function auditTrailDescription(row: AuditTrailEntry): string | null {
  const direct =
    row.description?.trim() ||
    row.message?.trim() ||
    row.details?.trim() ||
    "";
  if (direct) return direct;

  const actor = auditTrailUserLabel(row.created_by ?? row.user ?? row.actor);
  const action = auditTrailActionLabel(row);
  if (actor && action) return `${actor} — ${action}`;
  if (actor) return actor;
  return null;
}

function auditTrailOccurredAt(row: AuditTrailEntry): string | null {
  return row.created_at?.trim() || row.occurred_at?.trim() || row.timestamp?.trim() || null;
}

function auditTrailObjectId(row: AuditTrailEntry): number | null {
  const raw = row.object_id ?? row.record_id;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  return null;
}

/** Map audit-trail API rows into material-request timeline entries. */
export function auditTrailToMaterialRequestLogEntry(row: AuditTrailEntry): MaterialRequestLogEntry {
  const metadata = row.metadata;
  const dispatchIdRaw =
    metadata && typeof metadata === "object" && metadata !== null && "dispatch_id" in metadata
      ? metadata.dispatch_id
      : undefined;
  const dispatchId =
    typeof dispatchIdRaw === "number" && Number.isFinite(dispatchIdRaw) && dispatchIdRaw > 0
      ? dispatchIdRaw
      : undefined;

  return {
    id: row.id,
    title: auditTrailActionLabel(row) || undefined,
    description: auditTrailDescription(row) ?? undefined,
    occurred_at: auditTrailOccurredAt(row) ?? undefined,
    tag: row.action?.trim() || row.event?.trim() || row.module?.trim() || undefined,
    dispatch_id: dispatchId,
  };
}

export function filterAuditTrailsForObject(
  rows: AuditTrailEntry[],
  objectId: number,
): AuditTrailEntry[] {
  return rows.filter((row) => auditTrailObjectId(row) === objectId);
}
