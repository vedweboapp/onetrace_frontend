import { pdfjs } from "react-pdf";
import api from "@/core/api/axios";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type LevelSnapshot = {
  objectUrl: string;
  width: number;
  height: number;
};

// Keep cache of completed and in-flight conversions
const snapshotCache = new Map<string, Promise<LevelSnapshot>>();

// ---------------------------------------------------------------------------
// Global concurrency semaphore — max 5 snapshot renders running at any time,
// across ALL callers (preview scroll trigger + export-time fill-in).
// ---------------------------------------------------------------------------
export const SNAPSHOT_CONCURRENCY = 5;

let _activeCount = 0;
const _waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (_activeCount < SNAPSHOT_CONCURRENCY) {
    _activeCount++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    _waitQueue.push(resolve);
  });
}

function releaseSlot(): void {
  const next = _waitQueue.shift();
  if (next) {
    // Hand the slot directly to the next waiter (count stays the same)
    next();
  } else {
    _activeCount--;
  }
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

async function fetchDrawingArrayBuffer(fileUrl: string): Promise<ArrayBuffer> {
  try {
    const res = await api.get<ArrayBuffer>(fileUrl, {
      responseType: "arraybuffer",
      skipErrorToast: true,
    });
    return res.data;
  } catch {
    const rawRes = await fetch(fileUrl);
    if (!rawRes.ok) {
      throw new Error(`HTTP ${rawRes.status} fetching drawing: ${fileUrl}`);
    }
    return await rawRes.arrayBuffer();
  }
}

export async function getOrCreateLevelSnapshot(fileUrl: string): Promise<LevelSnapshot> {
  const existing = snapshotCache.get(fileUrl);
  if (existing) {
    return existing;
  }

  const promise = (async (): Promise<LevelSnapshot> => {
    // Block here until a concurrency slot is free
    await acquireSlot();
    try {
      // Fetch drawing bytes with authentication / CORS handling
      const arrayBuffer = await fetchDrawingArrayBuffer(fileUrl);

      // 1. If it's an image file (not PDF), load directly via HTMLImageElement
      if (!isPdfUrl(fileUrl)) {
        const blob = new Blob([arrayBuffer]);
        const blobUrl = URL.createObjectURL(blob);
        return await new Promise<LevelSnapshot>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              objectUrl: blobUrl,
              width: img.naturalWidth || 1200,
              height: img.naturalHeight || 800,
            });
          };
          img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            reject(new Error(`Failed to load drawing image: ${fileUrl}`));
          };
          img.src = blobUrl;
        });
      }

      // 2. If it's a PDF file, render first page via PDF.js
      let pdf: any = null;
      try {
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
        pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1.0 });
        const targetWidth = 2400;
        const scale = targetWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Could not get 2d context");
        }

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        const resultBlob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/webp", 0.9);
        });

        if (!resultBlob) {
          throw new Error("Could not convert canvas to blob");
        }

        const objectUrl = URL.createObjectURL(resultBlob);
        return {
          objectUrl,
          width: scaledViewport.width,
          height: scaledViewport.height,
        };
      } catch (err) {
        snapshotCache.delete(fileUrl);
        throw err;
      } finally {
        if (pdf) {
          try { await pdf.destroy(); } catch { /* ignore */ }
        }
      }
    } finally {
      releaseSlot();
    }
  })();

  snapshotCache.set(fileUrl, promise);
  return promise;
}

const releaseCallbacks = new Set<(url: string) => void>();

export function registerReleaseCallback(cb: (url: string) => void) {
  releaseCallbacks.add(cb);
  return () => {
    releaseCallbacks.delete(cb);
  };
}

export function releaseLevelSnapshot(pdfUrl: string): void {
  const promise = snapshotCache.get(pdfUrl);
  if (promise) {
    snapshotCache.delete(pdfUrl);
    promise.then((snapshot) => {
      URL.revokeObjectURL(snapshot.objectUrl);
      releaseCallbacks.forEach((cb) => cb(pdfUrl));
    }).catch(() => {
      // ignore
    });
  }
}
