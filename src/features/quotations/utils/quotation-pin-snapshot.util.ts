import { getOrCreateLevelSnapshot, releaseLevelSnapshot, registerReleaseCallback, type LevelSnapshot } from "@/shared/utils/pdf-snapshot.util";
import { createConcurrencyLimiter } from "@/shared/utils/concurrency-limit.util";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";
import type {
  ProjectLevelForQuotation,
  QuotationPlotPin,
  QuotationQuoteSection,
  QuotationQuoteSectionSourcePin,
} from "@/features/quotations/types/quotation.types";
import { getQuotePlotPinsForDisplay } from "@/features/quotations/utils/quotation-quote-plot-pins.util";

/** Concurrency limit for snapshot generation queue. */
export const PIN_SNAP_CONCURRENCY_LIMIT = 5;

/** Concurrency limiter capped at 5 simultaneous pin crop operations. */
const cropConcurrencyLimiter = createConcurrencyLimiter(PIN_SNAP_CONCURRENCY_LIMIT);

/** Cache loaded image elements for level snapshots to prevent redundant loads */
const snapshotImgCache = new Map<string, Promise<HTMLImageElement>>();

// Register release callback to clear snapshotImgCache when level snapshot is released
registerReleaseCallback((url) => {
  snapshotImgCache.delete(url);
});

function loadSnapshotImage(objectUrl: string): Promise<HTMLImageElement> {
  const existing = snapshotImgCache.get(objectUrl);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!objectUrl.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      snapshotImgCache.delete(objectUrl);
      reject(new Error("Failed to load snapshot level image"));
    };
    img.src = objectUrl;
  });

  snapshotImgCache.set(objectUrl, promise);
  return promise;
}

export function getQuotationPinSnapshotKey(
  sectionIdx: number,
  plotIdx: number,
  pinGroupIdx: number,
  sourcePinIdx: number,
): string {
  return `s${sectionIdx}_p${plotIdx}_g${pinGroupIdx}_pin${sourcePinIdx}`;
}

export type PinCropOptions = {
  xPercent: number;
  yPercent: number;
  pinColor?: string;
  locationLabel?: string | number;
};

/**
 * Renders a cropped region centered on a pin coordinate from a section level snapshot canvas.
 * Returns an in-memory Data URL (image/webp) for low memory footprint.
 */
export async function createPinCropDataUrl(
  snapshot: LevelSnapshot,
  options: PinCropOptions,
): Promise<string> {
  return cropConcurrencyLimiter(async () => {
    const img = await loadSnapshotImage(snapshot.objectUrl);
    const { width: snapshotWidth, height: snapshotHeight } = snapshot;
    const { xPercent, yPercent, pinColor = "#10b981", locationLabel } = options;

    const smallerDim = Math.min(snapshotWidth, snapshotHeight);
    const marginFraction = 0.22; // Larger than PinThumbnailCropped's default 0.15 for more context
    const cropSize = Math.round(smallerDim * marginFraction * 2);

    const cx = Math.round((Math.max(0, Math.min(100, xPercent)) / 100) * snapshotWidth);
    const cy = Math.round((Math.max(0, Math.min(100, yPercent)) / 100) * snapshotHeight);

    let sx = cx - Math.round(cropSize / 2);
    let sy = cy - Math.round(cropSize / 2);

    // Clamp crop region within image bounds
    sx = Math.max(0, Math.min(sx, snapshotWidth - cropSize));
    sy = Math.max(0, Math.min(sy, snapshotHeight - cropSize));

    const sw = Math.min(cropSize, snapshotWidth - sx);
    const sh = Math.min(cropSize, snapshotHeight - sy);

    if (sw <= 0 || sh <= 0) {
      throw new Error("Invalid crop dimensions");
    }

    const canvasWidth = 280;
    const canvasHeight = 200;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.width = 0;
      canvas.height = 0;
      throw new Error("Failed to get 2d canvas context");
    }

    // Use createImageBitmap to load crop asynchronously and close it immediately
    const bitmap = await createImageBitmap(img, sx, sy, sw, sh);
    try {
      ctx.drawImage(bitmap, 0, 0, canvasWidth, canvasHeight);
    } finally {
      bitmap.close();
    }

    // Calculate relative pin coordinates in canvas
    const px = cx - sx;
    const py = cy - sy;
    const pinCanvasX = (px / sw) * canvasWidth;
    const pinCanvasY = (py / sh) * canvasHeight;

    // Draw Pin Marker on Canvas
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    const pinRadius = 12;
    const pinY = pinCanvasY - 14;

    // Outer circle
    ctx.beginPath();
    ctx.arc(pinCanvasX, pinY, pinRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = pinColor;
    ctx.stroke();

    // Pointer needle
    ctx.beginPath();
    ctx.moveTo(pinCanvasX - 5, pinCanvasY - 4);
    ctx.lineTo(pinCanvasX, pinCanvasY);
    ctx.lineTo(pinCanvasX + 5, pinCanvasY - 4);
    ctx.closePath();
    ctx.fillStyle = pinColor;
    ctx.fill();

    // Location label or center dot
    if (locationLabel != null && String(locationLabel).trim() !== "") {
      ctx.fillStyle = pinColor;
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(locationLabel).slice(0, 4), pinCanvasX, pinY);
    } else {
      ctx.beginPath();
      ctx.arc(pinCanvasX, pinY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = pinColor;
      ctx.fill();
    }

    ctx.restore();

    // Prefer WebP; fall back when the browser cannot encode it (empty/invalid data URL).
    let dataUrl = canvas.toDataURL("image/webp", 0.85);
    if (!dataUrl.startsWith("data:image/webp")) {
      dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    }

    // Explicitly release canvas memory
    canvas.width = 0;
    canvas.height = 0;

    return dataUrl;
  });
}

export type PinSnapshotTask = {
  key: string;
  sectionIndex: number;
  plotIndex: number;
  pinGroupIndex: number;
  sourcePinIndex: number;
  drawingFile: string;
  sourcePin: QuotationQuoteSectionSourcePin;
  xPercent: number;
  yPercent: number;
};

/** API sometimes returns pin coords as strings — coerce so snapshot tasks are not skipped. */
function toFiniteCoord(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Drawing editors usually store 0–100%; some APIs return 0–1 fractions. */
function asPercentCoord(n: number): number {
  if (n > 0 && n < 1) return n * 100;
  return n;
}

function coordsFromSourcePin(sourcePin: QuotationQuoteSectionSourcePin): { x: number; y: number } | null {
  let x = toFiniteCoord(sourcePin.x_coordinate);
  let y = toFiniteCoord(sourcePin.y_coordinate);
  const coords = (sourcePin as { coordinates?: unknown }).coordinates;
  if ((x == null || y == null) && Array.isArray(coords) && coords.length >= 2) {
    x = toFiniteCoord(coords[0]);
    y = toFiniteCoord(coords[1]);
  }
  if (x == null || y == null) return null;
  return { x: asPercentCoord(x), y: asPercentCoord(y) };
}

type LevelPinLookup = {
  x: number;
  y: number;
  location: number | string | null;
  name: string | null;
  quantity: number | null;
  description: string | null;
  variation: boolean | null;
};

function plotPinDisplayName(pin: QuotationPlotPin): string | null {
  const detail = pin.item_detail;
  const fromDetail = typeof detail?.name === "string" ? detail.name.trim() : "";
  if (fromDetail) return fromDetail;
  const c1 = typeof pin.composite_item_name === "string" ? pin.composite_item_name.trim() : "";
  if (c1) return c1;
  const c2 = typeof pin.composite_name === "string" ? pin.composite_name.trim() : "";
  if (c2) return c2;
  const n = typeof pin.name === "string" ? pin.name.trim() : "";
  return n || null;
}

function buildLevelPinLookup(levels: ProjectLevelForQuotation[]): {
  byPinId: Map<number, LevelPinLookup>;
  drawingByLevelId: Map<number, string>;
} {
  const byPinId = new Map<number, LevelPinLookup>();
  const drawingByLevelId = new Map<number, string>();

  for (const level of levels) {
    if (typeof level.drawing_file === "string" && level.drawing_file.trim()) {
      drawingByLevelId.set(level.id, level.drawing_file.trim());
    }
    for (const plot of level.plots ?? []) {
      for (const pin of plot.pins ?? []) {
        if (typeof pin.id !== "number" || !Number.isFinite(pin.id) || pin.id <= 0) continue;
        const x = toFiniteCoord(pin.x_coordinate);
        const y = toFiniteCoord(pin.y_coordinate);
        if (x == null || y == null) continue;
        byPinId.set(pin.id, {
          x: asPercentCoord(x),
          y: asPercentCoord(y),
          location: pin.location ?? null,
          name: plotPinDisplayName(pin),
          quantity: typeof pin.quantity === "number" && Number.isFinite(pin.quantity) ? pin.quantity : null,
          description: typeof pin.description === "string" ? pin.description : null,
          variation: typeof pin.variation === "boolean" ? pin.variation : null,
        });
      }
    }
  }

  return { byPinId, drawingByLevelId };
}

function mergeSourcePinFromLookup(
  sourcePin: QuotationQuoteSectionSourcePin,
  lookup: LevelPinLookup | undefined,
): QuotationQuoteSectionSourcePin {
  if (!lookup) return sourcePin;
  const existing = coordsFromSourcePin(sourcePin);
  return {
    ...sourcePin,
    x_coordinate: existing?.x ?? lookup.x,
    y_coordinate: existing?.y ?? lookup.y,
    location:
      sourcePin.location != null && String(sourcePin.location).trim() !== ""
        ? sourcePin.location
        : lookup.location,
    name: sourcePin.name?.trim() ? sourcePin.name : lookup.name,
    quantity: sourcePin.quantity ?? lookup.quantity,
    description: sourcePin.description ?? lookup.description,
    variation: sourcePin.variation ?? lookup.variation,
  };
}

/**
 * Resolve quotation `project` id whether the API returns a number or `{ id }`.
 */
export function resolveQuotationProjectId(project: unknown): number | null {
  if (typeof project === "number" && Number.isFinite(project) && project > 0) return project;
  if (project && typeof project === "object" && "id" in project) {
    const id = Number((project as { id: unknown }).id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  return null;
}

/**
 * Fills missing drawing_file / pin coordinates / location labels from project level rows
 * so PDF pin snapshots match the pin-location detail view.
 */
export function enrichQuoteSectionsForPinSnapshots(
  quoteSections: QuotationQuoteSection[],
  levels: ProjectLevelForQuotation[],
): QuotationQuoteSection[] {
  if (!quoteSections.length) return quoteSections;
  const { byPinId, drawingByLevelId } = buildLevelPinLookup(levels);
  if (byPinId.size === 0 && drawingByLevelId.size === 0) return quoteSections;

  return quoteSections.map((sec) => {
    const drawingFromLevel =
      typeof sec.level_id === "number" && sec.level_id > 0
        ? drawingByLevelId.get(sec.level_id)
        : undefined;
    const drawing_file =
      typeof sec.drawing_file === "string" && sec.drawing_file.trim()
        ? sec.drawing_file
        : drawingFromLevel ?? sec.drawing_file ?? null;

    const plots = (sec.plots ?? []).map((plot) => {
      const pins = getQuotePlotPinsForDisplay(plot).map((group) => {
        const sourcePins = group.source_pins ?? [];
        if (sourcePins.length > 0) {
          return {
            ...group,
            source_pins: sourcePins.map((sp) => {
              const pinId =
                typeof sp.pin_id === "number" && sp.pin_id > 0
                  ? sp.pin_id
                  : sourcePins.length === 1 &&
                      typeof group.pin_id === "number" &&
                      group.pin_id > 0
                    ? group.pin_id
                    : null;
              return mergeSourcePinFromLookup(sp, pinId != null ? byPinId.get(pinId) : undefined);
            }),
          };
        }

        if (typeof group.pin_id === "number" && group.pin_id > 0) {
          const lookup = byPinId.get(group.pin_id);
          if (lookup) {
            return {
              ...group,
              source_pins: [
                mergeSourcePinFromLookup(
                  {
                    pin_id: group.pin_id,
                    x_coordinate: null,
                    y_coordinate: null,
                    name: group.name,
                    quantity: group.quantity,
                    status_name: null,
                    location: null,
                    variation: null,
                    description: null,
                  },
                  lookup,
                ),
              ],
            };
          }
        }

        return group;
      });
      return { ...plot, pins };
    });

    return { ...sec, drawing_file, plots };
  });
}

/**
 * Scans quote_sections to extract all real positioned source_pins tasks.
 */
export function extractPinSnapshotTasks(
  quoteSections: QuotationQuoteSection[],
): PinSnapshotTask[] {
  const tasks: PinSnapshotTask[] = [];

  quoteSections.forEach((sec, secIdx) => {
    if (!sec.drawing_file) return;
    const resolvedUrl = resolveDrawingFileUrl(sec.drawing_file);
    if (!resolvedUrl) return;

    (sec.plots ?? []).forEach((plot, plotIdx) => {
      getQuotePlotPinsForDisplay(plot).forEach((group, groupIdx) => {
        const sourcePins = group.source_pins ?? [];
        if (sourcePins.length === 0) return;

        sourcePins.forEach((sourcePin, pinIdx) => {
          const coords = coordsFromSourcePin(sourcePin);
          if (!coords) return;

          tasks.push({
            key: getQuotationPinSnapshotKey(secIdx, plotIdx, groupIdx, pinIdx),
            sectionIndex: secIdx,
            plotIndex: plotIdx,
            pinGroupIndex: groupIdx,
            sourcePinIndex: pinIdx,
            drawingFile: resolvedUrl,
            sourcePin,
            xPercent: coords.x,
            yPercent: coords.y,
          });
        });
      });
    });
  });

  return tasks;
}

function withTimeout<T>(promise: Promise<T>, ms: number, errMsg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errMsg)), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Generates per-pin position snapshots across quote_sections.
 * - Fetches drawing_file ONCE per section.
 * - Processes pin crops in batches capped at 5 concurrent operations globally.
 * - Releases full level drawing snapshot immediately when all pins for that drawing are done.
 */
export async function generateQuotationPinSnapshots(
  quoteSections: QuotationQuoteSection[],
  onPinComplete?: (key: string, dataUrl: string) => void,
  isCancelled?: () => boolean,
): Promise<Map<string, string>> {
  const resultMap = new Map<string, string>();
  const tasks = extractPinSnapshotTasks(quoteSections);
  if (tasks.length === 0) return resultMap;

  // Track remaining pin task count per drawing file to release early
  const remainingCount = new Map<string, number>();
  for (const task of tasks) {
    remainingCount.set(task.drawingFile, (remainingCount.get(task.drawingFile) ?? 0) + 1);
  }

  // Group tasks by section drawing file to ensure 1 fetch per level
  const sectionSnapshotPromises = new Map<string, Promise<LevelSnapshot>>();

  function getSectionSnapshot(drawingUrl: string): Promise<LevelSnapshot> {
    let promise = sectionSnapshotPromises.get(drawingUrl);
    if (!promise) {
      promise = getOrCreateLevelSnapshot(drawingUrl);
      sectionSnapshotPromises.set(drawingUrl, promise);
    }
    return promise;
  }

  // Single global queue limiting concurrency of the entire snapshot workflow
  const queueLimiter = createConcurrencyLimiter(PIN_SNAP_CONCURRENCY_LIMIT);

  await Promise.all(
    tasks.map((task) =>
      queueLimiter(async () => {
        if (isCancelled?.()) return;

        try {
          // Large drawings can take longer than a short timeout on first render.
          const levelSnap = await withTimeout(
            getSectionSnapshot(task.drawingFile),
            45000,
            `Failed to load blueprint drawing: ${task.drawingFile}`,
          );

          if (isCancelled?.()) return;

          const dataUrl = await withTimeout(
            createPinCropDataUrl(levelSnap, {
              xPercent: task.xPercent,
              yPercent: task.yPercent,
              locationLabel: task.sourcePin.location ?? undefined,
            }),
            15000,
            "Failed to crop pin thumbnail snapshot",
          );

          if (isCancelled?.()) return;

          resultMap.set(task.key, dataUrl);
          onPinComplete?.(task.key, dataUrl);
        } catch (err) {
          console.warn("Pin snapshot crop generation failed for task:", task.key, err);
        } finally {
          // Decrement and release the drawing level snapshot as soon as no more pins need it
          const count = remainingCount.get(task.drawingFile) ?? 0;
          if (count > 1) {
            remainingCount.set(task.drawingFile, count - 1);
          } else {
            remainingCount.delete(task.drawingFile);
            releaseLevelSnapshot(task.drawingFile);
          }
        }
      }),
    ),
  );

  return resultMap;
}
