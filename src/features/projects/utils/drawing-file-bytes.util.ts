import api from "@/core/api/axios";

// ── Resolved-buffer cache ───────────────────────────────────────────────────
// Two-tier cache: in-flight Promises + already-resolved ArrayBuffers.
// This prevents re-fetching a file whose Promise resolved but the component remounted.
const inflightCache = new Map<string, Promise<ArrayBuffer>>();
const resolvedCache = new Map<string, ArrayBuffer>();

// ── Concurrency limiter ─────────────────────────────────────────────────────
// Cap simultaneous PDF/image fetches at 4 to avoid saturating the browser
// connection pool and starving other API requests.
const MAX_CONCURRENT = 4;
let running = 0;
const queue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (running < MAX_CONCURRENT) {
    running++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function releaseSlot() {
  const next = queue.shift();
  if (next) {
    next();
  } else {
    running--;
  }
}

function looksLikePdf(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 1024)));
  for (let i = 0; i <= bytes.length - 4; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46    // F
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Fetch drawing/media bytes with auth (falls back to plain fetch).
 * Results are cached in memory — resolved buffers are never re-downloaded.
 * Concurrent fetches are capped at MAX_CONCURRENT.
 */
export function fetchDrawingArrayBuffer(fileUrl: string): Promise<ArrayBuffer> {
  // 1. Already resolved → return instantly
  const resolved = resolvedCache.get(fileUrl);
  if (resolved) return Promise.resolve(resolved);

  // 2. In-flight → reuse the same promise
  const inflight = inflightCache.get(fileUrl);
  if (inflight) return inflight;

  // 3. New fetch — wait for a concurrency slot
  const promise = (async () => {
    await acquireSlot();
    try {
      let buffer: ArrayBuffer;
      try {
        const res = await api.get<ArrayBuffer>(fileUrl, {
          responseType: "arraybuffer",
          skipErrorToast: true,
        });
        buffer = res.data;
      } catch {
        const rawRes = await fetch(fileUrl);
        if (!rawRes.ok) {
          throw new Error(`HTTP ${rawRes.status} fetching drawing: ${fileUrl}`);
        }
        buffer = await rawRes.arrayBuffer();
      }
      // Promote to resolved cache
      resolvedCache.set(fileUrl, buffer);
      inflightCache.delete(fileUrl);
      return buffer;
    } catch (error) {
      inflightCache.delete(fileUrl);
      throw error;
    } finally {
      releaseSlot();
    }
  })();

  inflightCache.set(fileUrl, promise);
  return promise;
}

/** Load PDF bytes for react-pdf `Document` (`{ data }`). Rejects non-PDF payloads. */
export async function fetchDrawingPdfData(fileUrl: string): Promise<Uint8Array> {
  const buffer = await fetchDrawingArrayBuffer(fileUrl);
  if (!looksLikePdf(buffer)) {
    throw new Error(`Response is not a PDF: ${fileUrl}`);
  }
  // Slice to get an independent Uint8Array (react-pdf may transfer ownership)
  return new Uint8Array(buffer.slice(0));
}

