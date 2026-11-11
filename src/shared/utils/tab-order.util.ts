/** Merge a saved tab id order with the current default list (drop unknown ids, append new ones). */
export function applyTabOrder(defaultIds: readonly string[], savedIds: readonly string[] | null | undefined): string[] {
  if (!savedIds?.length) return [...defaultIds];
  const allowed = new Set(defaultIds);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of savedIds) {
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  for (const id of defaultIds) {
    if (seen.has(id)) continue;
    ordered.push(id);
  }
  return ordered;
}
//see this is stripe 
export function readStoredTabOrder(storageKey: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  } catch {
    return null;
  }
}

export function writeStoredTabOrder(storageKey: string, ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify([...ids]));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearStoredTabOrder(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

export function moveTabOrderItem(ids: readonly string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex === toIndex) return [...ids];
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= ids.length || toIndex >= ids.length) return [...ids];
  const next = [...ids];
  const [item] = next.splice(fromIndex, 1);
  if (item == null) return [...ids];
  next.splice(toIndex, 0, item);
  return next;
}
