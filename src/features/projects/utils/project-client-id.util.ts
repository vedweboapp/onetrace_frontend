/** API may return `client` as an id or as `{ id, name, ... }`. */
export function getProjectClientId(project: { client: unknown }): number | null {
  const c = project.client;
  if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
  if (c && typeof c === "object" && "id" in c) {
    const id = (c as { id: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id) && id > 0) return id;
  }
  return null;
}
