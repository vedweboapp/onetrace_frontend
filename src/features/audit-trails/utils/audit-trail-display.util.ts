import type { AuditTrailEntry, AuditTrailUserRef } from "@/features/audit-trails/types/audit-trail.types";
import type { MaterialRequestLogEntry } from "@/features/material-requests/types/material-request.types";

function auditTrailActor(row: AuditTrailEntry): AuditTrailUserRef | null {
  return row.actor ?? row.created_by ?? row.user ?? null;
}

function auditTrailUserLabel(user: AuditTrailUserRef | null | undefined): string | null {
  if (!user) return null;
  const displayName = user.name?.trim();
  if (displayName) return displayName;
  const parts = [user.first_name?.trim(), user.last_name?.trim()].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  const username = user.username?.trim();
  if (username) return username;
  const email = user.email?.trim();
  if (email) return email;
  return null;
}

export function auditTrailActionLabel(row: AuditTrailEntry): string {
  const raw =
    row.action?.trim() ||
    row.event?.trim() ||
    row.event_type?.trim() ||
    row.title?.trim() ||
    "";
  if (!raw) return "";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Insert spaces where API descriptions glue words to codes (MR059, JB437, etc.). */
export function formatAuditTrailDescription(raw: string | null | undefined): string {
  let text = raw?.trim() ?? "";
  if (!text) return "";

  text = text.replace(/(Material Request)(MR\d+)/gi, "$1 $2");
  text = text.replace(/(MR\d+)(genearted|generated)/gi, "$1 $2");
  text = text.replace(/\bfor job(JB\d+)/gi, "for job $1");
  text = text.replace(/(Dispatch)(DISP\d+)/gi, "$1 $2");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function auditTrailPrimaryText(row: AuditTrailEntry): string {
  const direct = formatAuditTrailDescription(
    row.description?.trim() || row.message?.trim() || row.details?.trim() || "",
  );
  if (direct) return direct;

  const actor = auditTrailUserLabel(auditTrailActor(row));
  const action = auditTrailActionLabel(row);
  if (actor && action) return `${actor} — ${action}`;
  if (action) return action;
  if (actor) return actor;
  return "";
}

function auditTrailOccurredAt(row: AuditTrailEntry): string | null {
  return row.created_at?.trim() || row.occurred_at?.trim() || row.timestamp?.trim() || null;
}

function auditTrailObjectId(row: AuditTrailEntry): number | null {
  const raw = row.object_id ?? row.record_id;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  return null;
}

function auditTrailDispatchId(row: AuditTrailEntry): number | undefined {
  const metadata = row.metadata;
  const fromMeta =
    metadata && typeof metadata === "object" && metadata !== null && "dispatch_id" in metadata
      ? metadata.dispatch_id
      : undefined;
  if (typeof fromMeta === "number" && Number.isFinite(fromMeta) && fromMeta > 0) {
    return fromMeta;
  }

  const model = row.model_name?.trim().toLowerCase() ?? "";
  if (model === "dispatch" || row.action?.trim().toLowerCase() === "dispatch_created") {
    const objectId = auditTrailObjectId(row);
    if (objectId != null) return objectId;
  }

  return undefined;
}

/** Map audit-trail API rows into material-request timeline entries. */
export function auditTrailToMaterialRequestLogEntry(row: AuditTrailEntry): MaterialRequestLogEntry {
  const actor = auditTrailActor(row);

  return {
    id: row.id,
    title: auditTrailPrimaryText(row) || auditTrailActionLabel(row) || undefined,
    occurred_at: auditTrailOccurredAt(row) ?? undefined,
    tag: auditTrailActionLabel(row) || row.model_name?.trim() || row.module?.trim() || undefined,
    dispatch_id: auditTrailDispatchId(row),
    actor_name: auditTrailUserLabel(actor) ?? undefined,
    actor_role: actor?.role?.trim() || undefined,
  };
}

/**
 * Sort audit rows newest-first for activity timelines.
 * API order is usually correct; this keeps display stable when it is not.
 */
export function sortAuditTrailsByDateDesc(rows: AuditTrailEntry[]): AuditTrailEntry[] {
  return [...rows].sort((a, b) => {
    const aTime = Date.parse(auditTrailOccurredAt(a) ?? "") || 0;
    const bTime = Date.parse(auditTrailOccurredAt(b) ?? "") || 0;
    return bTime - aTime;
  });
}

/**
 * @deprecated Prefer trusting API `object_id` filter — related rows (e.g. dispatches)
 * may use their own object_id while still belonging to the material request timeline.
 */
export function filterAuditTrailsForObject(
  rows: AuditTrailEntry[],
  objectId: number,
): AuditTrailEntry[] {
  return rows.filter((row) => auditTrailObjectId(row) === objectId);
}
