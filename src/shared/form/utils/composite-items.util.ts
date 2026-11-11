import { useEffect, useState } from "react";
import { fetchItemsPage } from "@/features/items/api/item.api";

export type CompositeItemEntry = {
  id: number;
  name: string;
};

let cachedCompositeItems: CompositeItemEntry[] | null = null;
let pendingPromise: Promise<CompositeItemEntry[]> | null = null;

/**
 * Fetches the composite items catalog from the API (with in-memory caching and request deduplication).
 */
export async function getCompositeItemsCatalog(): Promise<CompositeItemEntry[]> {
  if (cachedCompositeItems && cachedCompositeItems.length > 0) {
    return cachedCompositeItems;
  }
  if (pendingPromise) {
    return pendingPromise;
  }

  pendingPromise = (async () => {
    try {
      const res = await fetchItemsPage(1, 200, { dropdown: true, isComposite: true });
      const items = (res.items || []).map((it) => ({
        id: it.id,
        name: it.name,
      }));
      cachedCompositeItems = items;
      return items;
    } catch {
      return [];
    } finally {
      pendingPromise = null;
    }
  })();

  return pendingPromise;
}

/**
 * Invalidate in-memory composite items cache.
 */
export function clearCompositeItemsCache() {
  cachedCompositeItems = null;
  pendingPromise = null;
}

/**
 * Resolves runtime options for a field if it is a composite picklist/multi-select.
 * Checks the field's composite_items array (which contains IDs e.g. [{ id: 1 }] or [1, 2])
 * and matches each ID against the catalog to return runtime options with labels.
 */
export function resolveCompositeFieldOptions(
  field: { is_composite?: boolean; composite_items?: any[]; options?: any[] } | null | undefined,
  catalog: CompositeItemEntry[],
): { label: string; value: string }[] {
  if (!field?.is_composite) {
    return (field?.options || []).map((opt) =>
      typeof opt === "string" ? { label: opt, value: opt } : { label: opt.label, value: opt.value }
    );
  }

  const rawList = Array.isArray(field.composite_items) ? field.composite_items : [];
  if (rawList.length === 0) return [];

  const rawIds = rawList.map((ci: any) =>
    typeof ci === "object" && ci !== null ? String(ci.id ?? ci.value ?? "") : String(ci)
  );

  return rawIds
    .map((idStr) => {
      const matched = catalog.find((cat) => String(cat.id) === idStr);
      return {
        label: matched ? matched.name : `Item ${idStr}`,
        value: idStr,
      };
    })
    .filter((opt) => opt.value !== "");
}

/**
 * React hook that fetches and returns the composite items catalog.
 */
export function useCompositeItemsCatalog(enabled = true) {
  const [catalog, setCatalog] = useState<CompositeItemEntry[]>(() => cachedCompositeItems || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    if (cachedCompositeItems && cachedCompositeItems.length > 0) {
      setCatalog(cachedCompositeItems);
      return;
    }

    setLoading(true);
    getCompositeItemsCatalog().then((items) => {
      if (active) {
        setCatalog(items);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [enabled]);

  return { catalog, loading };
}

