/**
 * Ensures only one detail inline-edit field is active at a time.
 * Another field cannot enter edit until the active one is saved or cancelled.
 */
let activeFieldId: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeDetailInlineEditLock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDetailInlineEditLockId(): string | null {
  return activeFieldId;
}

/** Returns true when this field may enter (or keep) edit mode. */
export function claimDetailInlineEdit(fieldId: string): boolean {
  if (activeFieldId != null && activeFieldId !== fieldId) return false;
  if (activeFieldId === fieldId) return true;
  activeFieldId = fieldId;
  notify();
  return true;
}

export function releaseDetailInlineEdit(fieldId: string): void {
  if (activeFieldId !== fieldId) return;
  activeFieldId = null;
  notify();
}

export function isDetailInlineEditBlocked(fieldId: string): boolean {
  return activeFieldId != null && activeFieldId !== fieldId;
}
