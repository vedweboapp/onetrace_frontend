"use client";

import * as React from "react";
import {
  parseDuplicateEntryConflict,
  type DuplicateEntryConflict,
} from "@/shared/form/duplicate-entry.util";

type Args = {
  /** Detail page path for the existing record (opened in a new tab from “View”). */
  getDetailHref: (existingId: number) => string;
};

/**
 * Create-form helper for API `DUPLICATE_ENTRY` responses that include the existing row.
 * “View” opens the existing record’s detail page in a new tab.
 */
export function useDuplicateEntryConflict({ getDetailHref }: Args) {
  const [conflict, setConflict] = React.useState<DuplicateEntryConflict | null>(null);
  const getDetailHrefRef = React.useRef(getDetailHref);
  getDetailHrefRef.current = getDetailHref;

  const existingHref = React.useMemo(() => {
    if (!conflict) return null;
    const href = getDetailHrefRef.current(conflict.existingId)?.trim();
    return href || null;
  }, [conflict]);

  const capture = React.useCallback((error: unknown): boolean => {
    const parsed = parseDuplicateEntryConflict(error);
    if (!parsed) {
      setConflict(null);
      return false;
    }
    setConflict(parsed);
    return true;
  }, []);

  const clear = React.useCallback(() => {
    setConflict(null);
  }, []);

  const openExisting = React.useCallback(() => {
    if (!existingHref) return;
    window.open(existingHref, "_blank", "noopener,noreferrer");
  }, [existingHref]);

  return {
    conflict,
    existingHref,
    capture,
    clear,
    openExisting,
  };
}
