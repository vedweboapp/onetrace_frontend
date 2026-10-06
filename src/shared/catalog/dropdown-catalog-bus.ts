export type DropdownCatalogKind =
  | "users"
  | "roles"
  | "clients"
  | "contacts"
  | "sites"
  | "titles"
  | "projects"
  | "projectTypes"
  | "projectStatuses"
  | "tags"
  | "items"
  | "compositeItems"
  | "labours"
  | "vendors"
  | "vendorTypes"
  | "groups"
  | "userGroups"
  | "jobs"
  | "jobStatuses"
  | "pinStatuses"
  | "forms"
  | "checklistTypes"
  | "unitTypes"
  | "installationTypes"
  | "materialStatuses";

type Listener = (kind: DropdownCatalogKind) => void;
type Invalidator = (kind: DropdownCatalogKind) => void;

const listeners = new Set<Listener>();
const invalidators = new Set<Invalidator>();

/** Register a synchronous cache clear. Called before dropdown listeners refetch. */
export function registerDropdownCatalogInvalidator(invalidator: Invalidator): () => void {
  invalidators.add(invalidator);
  return () => {
    invalidators.delete(invalidator);
  };
}

/** Longer prefixes first so `site-title` is not treated as `site`. */
const PREFIX_KINDS: ReadonlyArray<readonly [string, DropdownCatalogKind]> = [
  ["auth/invite-user", "users"],
  ["invite-user", "users"],
  ["user-profile", "users"],
  ["user-group", "userGroups"],
  ["site-title", "titles"],
  ["project-type", "projectTypes"],
  ["project-status", "projectStatuses"],
  ["project-form", "forms"],
  ["checklist-type", "checklistTypes"],
  ["composite-item", "compositeItems"],
  ["labourtypes", "labours"],
  ["labour-type", "labours"],
  ["labourtype", "labours"],
  ["installation-type", "installationTypes"],
  ["unit-type", "unitTypes"],
  ["vendor-type", "vendorTypes"],
  ["job-status", "jobStatuses"],
  ["job-form", "forms"],
  ["pin-status", "pinStatuses"],
  ["material-status", "materialStatuses"],
  ["clients", "clients"],
  ["contact", "contacts"],
  ["site", "sites"],
  ["forms", "forms"],
  ["item", "items"],
  ["vendors", "vendors"],
  ["group", "groups"],
  ["jobs", "jobs"],
  ["project", "projects"],
  ["tag", "tags"],
  ["role", "roles"],
];

export function subscribeDropdownCatalogChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function requestPath(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  const withoutQuery = raw.split("?")[0]?.split("#")[0] ?? "";
  try {
    if (/^https?:\/\//i.test(withoutQuery)) {
      return new URL(withoutQuery).pathname.replace(/^\/+/, "").toLowerCase();
    }
  } catch {
    // fall through
  }
  return withoutQuery.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
}

function pathMatchesPrefix(path: string, prefix: string): boolean {
  return (
    path === prefix ||
    path.startsWith(`${prefix}/`) ||
    path.includes(`/${prefix}/`) ||
    path.endsWith(`/${prefix}`)
  );
}

/** Maps mutating API URLs to the dropdown catalog they affect. */
export function dropdownCatalogKindFromRequest(
  method: string | undefined,
  url: string | undefined,
): DropdownCatalogKind | null {
  const verb = (method ?? "get").toLowerCase();
  if (verb !== "post" && verb !== "put" && verb !== "patch" && verb !== "delete") return null;
  const path = requestPath(url ?? "");
  if (!path) return null;

  for (const [prefix, kind] of PREFIX_KINDS) {
    if (pathMatchesPrefix(path, prefix)) return kind;
  }
  return null;
}

/**
 * Tells open screens that a catalog changed.
 * Registered caches are cleared before listeners refetch.
 */
export function notifyDropdownCatalogChanged(kind: DropdownCatalogKind): void {
  if (typeof window === "undefined") return;
  invalidators.forEach((invalidator) => {
    try {
      invalidator(kind);
    } catch {
      // One cache failing must not block the others.
    }
  });
  listeners.forEach((listener) => listener(kind));
}
