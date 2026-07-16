/**
 * pin-geometry.util.ts
 *
 * Utilities to persist a single pin's coordinates to sessionStorage so that
 * the drawing editor can auto-focus (zoom + scroll) to that pin on load.
 */

export type Vec2 = { x: number; y: number };

// --------------------------------------------------------------------------
// Simple single-pin focus helpers
// --------------------------------------------------------------------------

/** Stored in sessionStorage when the user opens a pin's detail panel. */
export type PinFocusEntry = {
  x: number;        // x_coordinate  (0-100 %)
  y: number;        // y_coordinate  (0-100 %)
  drawingId: number;
  projectId: number;
};

function pinFocusKey(projectId: number): string {
  return `pin_focus_${projectId}`;
}

/**
 * Save the pin's coordinates so the drawing editor can auto-focus on them.
 * Call this whenever a user opens a pin's detail panel from the Location tab.
 */
export function savePinFocus(
  x: number,
  y: number,
  projectId: number,
  drawingId: number,
): void {
  try {
    const entry: PinFocusEntry = { x, y, drawingId, projectId };
    sessionStorage.setItem(pinFocusKey(projectId), JSON.stringify(entry));
  } catch {
    // sessionStorage may be unavailable – fail silently
  }
}

/**
 * Read the saved pin focus entry.
 * Returns null if nothing was saved or the project ID doesn't match.
 */
export function readPinFocus(projectId: number): PinFocusEntry | null {
  try {
    const raw = sessionStorage.getItem(pinFocusKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PinFocusEntry;
    if (parsed.projectId !== projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear the saved pin focus entry after it has been consumed by the editor.
 */
export function clearPinFocus(projectId: number): void {
  try {
    sessionStorage.removeItem(pinFocusKey(projectId));
  } catch {
    // ignore
  }
}
