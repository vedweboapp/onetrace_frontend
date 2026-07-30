import { getOrCreateLevelSnapshot, releaseLevelSnapshot, registerReleaseCallback, type LevelSnapshot } from "@/shared/utils/pdf-snapshot.util";
import { createConcurrencyLimiter } from "@/shared/utils/concurrency-limit.util";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";
import type {
  QuotationQuoteSection,
  QuotationQuoteSectionSourcePin,
} from "@/features/quotations/types/quotation.types";

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

    // Store in compressed WebP format for minimal memory footprint
    const dataUrl = canvas.toDataURL("image/webp", 0.85);

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
};

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
      (plot.pins ?? []).forEach((group, groupIdx) => {
        (group.source_pins ?? []).forEach((sourcePin, pinIdx) => {
          if (
            typeof sourcePin.x_coordinate === "number" &&
            typeof sourcePin.y_coordinate === "number"
          ) {
            tasks.push({
              key: getQuotationPinSnapshotKey(secIdx, plotIdx, groupIdx, pinIdx),
              sectionIndex: secIdx,
              plotIndex: plotIdx,
              pinGroupIndex: groupIdx,
              sourcePinIndex: pinIdx,
              drawingFile: resolvedUrl,
              sourcePin,
            });
          }
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
          // Wrap document fetch with a 10s timeout
          const levelSnap = await withTimeout(
            getSectionSnapshot(task.drawingFile),
            10000,
            `Failed to load blueprint drawing: ${task.drawingFile}`
          );

          if (isCancelled?.()) return;

          // Wrap crop logic with a 5s timeout
          const dataUrl = await withTimeout(
            createPinCropDataUrl(levelSnap, {
              xPercent: task.sourcePin.x_coordinate ?? 0,
              yPercent: task.sourcePin.y_coordinate ?? 0,
              locationLabel: task.sourcePin.location ?? undefined,
            }),
            5000,
            "Failed to crop pin thumbnail snapshot"
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
      })
    )
  );

  return resultMap;
}
