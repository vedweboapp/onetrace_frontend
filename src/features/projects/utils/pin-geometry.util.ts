/**
 * pin-geometry.util.ts
 *
 * Utilities to persist drawing geometry and pin focus in localStorage so that
 * the drawing editor can retain coordinate state across browser sessions.
 */

export type Vec2 = { x: number; y: number };

// --------------------------------------------------------------------------
// Simple single-pin focus helpers
// --------------------------------------------------------------------------

/** Stored in localStorage when the user opens a pin's detail panel. */
export type PinFocusEntry = {
  x: number;        // x_coordinate  (0-100 %)
  y: number;        // y_coordinate  (0-100 %)
  drawingId: number;
  projectId: number;
};

function pinFocusKey(projectId: number, drawingId: number): string {
  return `pin_focus_${projectId}_${drawingId}`;
}

const drawingGeometryKeyPrefix = "drawing_geometry_";

type GeometryPoint = { x: number; y: number };

type DrawingGeometryStorage = {
  canonical: {
    plots: Record<string, number[][]>;
    pins: Record<string, GeometryPoint>;
  };
  draft: {
    plots: Record<string, number[][]>;
    pins: Record<string, GeometryPoint>;
  };
};

const defaultDrawingGeometryStorage: DrawingGeometryStorage = {
  canonical: { plots: {}, pins: {} },
  draft: { plots: {}, pins: {} },
};

function drawingGeometryKey(projectId: number, drawingId: number): string {
  return `${drawingGeometryKeyPrefix}${projectId}_${drawingId}`;
}

function readDrawingGeometry(projectId: number, drawingId: number): DrawingGeometryStorage {
  try {
    if (typeof localStorage === "undefined") return defaultDrawingGeometryStorage;
    const raw = localStorage.getItem(drawingGeometryKey(projectId, drawingId));
    if (!raw) return defaultDrawingGeometryStorage;
    const parsed = JSON.parse(raw) as DrawingGeometryStorage;
    return {
      canonical: {
        plots: parsed.canonical?.plots ?? {},
        pins: parsed.canonical?.pins ?? {},
      },
      draft: {
        plots: parsed.draft?.plots ?? {},
        pins: parsed.draft?.pins ?? {},
      },
    };
  } catch {
    return defaultDrawingGeometryStorage;
  }
}

function writeDrawingGeometry(projectId: number, drawingId: number, entry: DrawingGeometryStorage): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(drawingGeometryKey(projectId, drawingId), JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable – fail silently
  }
}

function saveDrawingPlotCoordinates(
  projectId: number,
  drawingId: number,
  plotId: number,
  coordinates: number[][],
  useDraft: boolean,
): void {
  try {
    const storage = readDrawingGeometry(projectId, drawingId);
    const nextStorage: DrawingGeometryStorage = {
      canonical: { ...storage.canonical, plots: { ...storage.canonical.plots } },
      draft: { ...storage.draft, plots: { ...storage.draft.plots } },
    };
    const key = String(plotId);
    if (useDraft) {
      nextStorage.draft.plots[key] = coordinates;
    } else {
      nextStorage.canonical.plots[key] = coordinates;
    }
    writeDrawingGeometry(projectId, drawingId, nextStorage);
  } catch {
    // ignore
  }
}

function saveDrawingPinCoordinates(
  projectId: number,
  drawingId: number,
  pinId: number,
  x: number,
  y: number,
  useDraft: boolean,
): void {
  try {
    const storage = readDrawingGeometry(projectId, drawingId);
    const nextStorage: DrawingGeometryStorage = {
      canonical: { ...storage.canonical, pins: { ...storage.canonical.pins } },
      draft: { ...storage.draft, pins: { ...storage.draft.pins } },
    };
    const key = String(pinId);
    if (useDraft) {
      nextStorage.draft.pins[key] = { x, y };
    } else {
      nextStorage.canonical.pins[key] = { x, y };
    }
    writeDrawingGeometry(projectId, drawingId, nextStorage);
  } catch {
    // ignore
  }
}

export function saveSelectedPlotCoordinates(
  projectId: number,
  drawingId: number,
  plotId: number,
  coordinates: number[][],
): void {
  saveDrawingPlotCoordinates(projectId, drawingId, plotId, coordinates, false);
}

export function stagePlotCoordinates(
  projectId: number,
  drawingId: number,
  plotId: number,
  coordinates: number[][],
): void {
  saveDrawingPlotCoordinates(projectId, drawingId, plotId, coordinates, true);
}

export function saveSelectedPinCoordinates(
  projectId: number,
  drawingId: number,
  pinId: number,
  x: number,
  y: number,
): void {
  saveDrawingPinCoordinates(projectId, drawingId, pinId, x, y, false);
}

export function stagePinCoordinates(
  projectId: number,
  drawingId: number,
  pinId: number,
  x: number,
  y: number,
): void {
  saveDrawingPinCoordinates(projectId, drawingId, pinId, x, y, true);
}

export function commitDrawingGeometryDraft(projectId: number, drawingId: number): void {
  try {
    const storage = readDrawingGeometry(projectId, drawingId);
    const next: DrawingGeometryStorage = {
      canonical: { ...storage.canonical },
      draft: { plots: {}, pins: {} },
    };
    writeDrawingGeometry(projectId, drawingId, next);
  } catch {
    // ignore
  }
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
    if (typeof localStorage === "undefined") return;
    const entry: PinFocusEntry = { x, y, drawingId, projectId };
    localStorage.setItem(pinFocusKey(projectId, drawingId), JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable – fail silently
  }
}

/**
 * Read the saved pin focus entry.
 * Returns null if nothing was saved or the project ID doesn't match.
 */
export function readPinFocus(projectId: number, drawingId: number): PinFocusEntry | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(pinFocusKey(projectId, drawingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PinFocusEntry;
    if (parsed.projectId !== projectId || parsed.drawingId !== drawingId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear the saved pin focus entry after it has been consumed by the editor.
 */
export function clearPinFocus(projectId: number, drawingId: number): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(pinFocusKey(projectId, drawingId));
  } catch {
    // ignore
  }
}

/**
 * Clear all saved pin focuses (e.g. on logout).
 */
export function clearAllPinFocus(): void {
  try {
    if (typeof localStorage === "undefined") return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("pin_focus_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * Clear all saved drawing geometry state when the user logs out.
 */
export function clearAllDrawingGeometry(): void {
  try {
    if (typeof localStorage === "undefined") return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(drawingGeometryKeyPrefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
