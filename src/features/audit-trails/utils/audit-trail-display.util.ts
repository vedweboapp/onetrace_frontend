import type { AuditTrailEntry, AuditTrailUserRef } from "@/features/audit-trails/types/audit-trail.types";
import type { MaterialRequestLogEntry } from "@/features/material-requests/types/material-request.types";

function auditTrailActor(row: AuditTrailEntry): AuditTrailUserRef | null {
  return row.actor ?? row.created_by ?? row.user ?? null;
}

export function auditTrailUserLabel(user: AuditTrailUserRef | null | undefined): string | null {
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

export function auditTrailActorFromEntry(row: AuditTrailEntry): AuditTrailUserRef | null {
  return auditTrailActor(row);
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

export function auditTrailPrimaryText(row: AuditTrailEntry): string {
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

export function auditTrailOccurredAt(row: AuditTrailEntry): string | null {
  return row.created_at?.trim() || row.occurred_at?.trim() || row.timestamp?.trim() || null;
}

export function auditTrailObjectId(row: AuditTrailEntry): number | null {
  const raw = row.object_id ?? row.record_id;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  return null;
}

export function auditTrailModuleLabel(row: AuditTrailEntry): string {
  const raw = row.module?.trim() || row.model_name?.trim() || "";
  if (!raw) return "";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

export type AuditTrailFieldChange = {
  field: string;
  from: string;
  to: string;
};

function formatChangeValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "—";
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Normalize API `changes` into rows for the Field changes modal. */
export function parseAuditTrailFieldChanges(changes: unknown): AuditTrailFieldChange[] {
  if (changes == null) return [];

  if (Array.isArray(changes)) {
    const rows: AuditTrailFieldChange[] = [];
    for (const item of changes) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const field =
        String(row.field ?? row.name ?? row.key ?? row.attribute ?? "").trim() || "Field";
      const from = formatChangeValue(row.from ?? row.old ?? row.previous ?? row.before);
      const to = formatChangeValue(row.to ?? row.new ?? row.next ?? row.after);
      rows.push({ field, from, to });
    }
    return rows;
  }

  if (typeof changes === "object") {
    const rows: AuditTrailFieldChange[] = [];
    for (const [field, value] of Object.entries(changes as Record<string, unknown>)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const pair = value as Record<string, unknown>;
        rows.push({
          field,
          from: formatChangeValue(pair.from ?? pair.old ?? pair.previous ?? pair.before),
          to: formatChangeValue(pair.to ?? pair.new ?? pair.next ?? pair.after),
        });
      } else {
        rows.push({ field, from: "—", to: formatChangeValue(value) });
      }
    }
    return rows;
  }

  return [];
}

export function auditTrailHasFieldChanges(row: AuditTrailEntry): boolean {
  return parseAuditTrailFieldChanges(row.changes).length > 0;
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
