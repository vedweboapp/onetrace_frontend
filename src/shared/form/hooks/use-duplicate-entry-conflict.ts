"use client";

import * as React from "react";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import {
  parseDuplicateEntryConflict,
  type DuplicateEntryConflict,
} from "@/shared/form/duplicate-entry.util";

type Args = {
  /** Called when the user chooses to update the existing record. */
  onUpdateExisting: (existingId: number) => Promise<void>;
  updatedToast?: string;
  updateErrorToast?: string;
};

/**
 * Create-form helper for API `DUPLICATE_ENTRY` responses that include the existing row.
 */
export function useDuplicateEntryConflict({
  onUpdateExisting,
  updatedToast,
  updateErrorToast,
}: Args) {
  const [conflict, setConflict] = React.useState<DuplicateEntryConflict | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const onUpdateRef = React.useRef(onUpdateExisting);
  onUpdateRef.current = onUpdateExisting;

  const capture = React.useCallback((error: unknown): boolean => {
    const parsed = parseDuplicateEntryConflict(error);
    if (!parsed) {
      setConflict(null);
      setModalOpen(false);
      return false;
    }
    setConflict(parsed);
    return true;
  }, []);

  const clear = React.useCallback(() => {
    setConflict(null);
    setModalOpen(false);
    setUpdating(false);
  }, []);

  const openModal = React.useCallback(() => {
    if (!conflict) return;
    setModalOpen(true);
  }, [conflict]);

  const keepExisting = React.useCallback(() => {
    setModalOpen(false);
  }, []);

  const updateExisting = React.useCallback(async () => {
    if (!conflict || updating) return;
    setUpdating(true);
    try {
      await onUpdateRef.current(conflict.existingId);
      if (updatedToast) toastSuccess(updatedToast);
      clear();
    } catch (error) {
      toastApiError(error, updateErrorToast);
    } finally {
      setUpdating(false);
    }
  }, [clear, conflict, updateErrorToast, updatedToast, updating]);

  return {
    conflict,
    modalOpen,
    updating,
    capture,
    clear,
    openModal,
    keepExisting,
    updateExisting,
  };
}
