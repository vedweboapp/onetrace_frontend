import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type LevelSnapshot = {
  objectUrl: string;
  width: number;
  height: number;
};

// Keep cache of completed and in-flight conversions
const snapshotCache = new Map<string, Promise<LevelSnapshot>>();

export async function getOrCreateLevelSnapshot(pdfUrl: string): Promise<LevelSnapshot> {
  const existing = snapshotCache.get(pdfUrl);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    let pdf: any = null;
    try {
      const loadingTask = pdfjs.getDocument(pdfUrl);
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

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/webp", 0.9);
      });

      if (!blob) {
        throw new Error("Could not convert canvas to blob");
      }

      const objectUrl = URL.createObjectURL(blob);
      return {
        objectUrl,
        width: scaledViewport.width,
        height: scaledViewport.height,
      };
    } catch (err) {
      // If conversion fails, remove from cache so we can retry if needed
      snapshotCache.delete(pdfUrl);
      throw err;
    } finally {
      if (pdf) {
        try {
          await pdf.destroy();
        } catch {
          // ignore
        }
      }
    }
  })();

  snapshotCache.set(pdfUrl, promise);
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
