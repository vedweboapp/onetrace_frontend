export type TabLayoutChoice = {
  order: string[];
  hidden: string[];
};

export type TabLayoutsMap = Record<string, TabLayoutChoice>;

/** Merge saved order with current default ids (drop unknown, append new). */
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

export function applyTabLayout(
  defaultIds: readonly string[],
  saved: TabLayoutChoice | null | undefined,
): TabLayoutChoice {
  const order = applyTabOrder(defaultIds, saved?.order);
  const allowed = new Set(order);
  const hidden = (saved?.hidden ?? []).filter((id) => allowed.has(id));
  return { order, hidden };
}

export function parseTabLayout(raw: unknown): TabLayoutChoice | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const order = raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
    return order.length ? { order, hidden: [] } : null;
  }
  if (typeof raw !== "object") return null;
  const rec = raw as { order?: unknown; hidden?: unknown };
  const order = Array.isArray(rec.order)
    ? rec.order.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  const hidden = Array.isArray(rec.hidden)
    ? rec.hidden.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  if (order.length === 0 && hidden.length === 0) return null;
  return { order, hidden };
}

export function readStoredTabLayout(storageKey: string): TabLayoutChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return parseTabLayout(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeStoredTabLayout(storageKey: string, layout: TabLayoutChoice): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(layout));
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredTabLayout(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    /* ignore */
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

export function visibleTabIds(layout: TabLayoutChoice, pinnedIds: readonly string[]): string[] {
  const hidden = new Set(layout.hidden);
  const pinned = new Set(pinnedIds);
  const visible = layout.order.filter((id) => pinned.has(id) || !hidden.has(id));
  if (visible.length > 0) return visible;
  return layout.order[0] ? [layout.order[0]] : [];
}

/** `ot.ui.tabOrder.{scope}.{userId}` → scope used in the backend payload. */
export function tabLayoutScopeFromStorageKey(storageKey: string): string {
  const parts = storageKey.split(".");
  if (parts.length >= 5 && parts[0] === "ot" && parts[1] === "ui" && parts[2] === "tabOrder") {
    return parts.slice(3, -1).join(".");
  }
  return storageKey;
}

export function layoutsAreEqual(a: TabLayoutChoice, b: TabLayoutChoice): boolean {
  if (a.order.length !== b.order.length || a.hidden.length !== b.hidden.length) return false;
  if (a.order.some((id, i) => id !== b.order[i])) return false;
  const hiddenB = new Set(b.hidden);
  return a.hidden.every((id) => hiddenB.has(id));
}
