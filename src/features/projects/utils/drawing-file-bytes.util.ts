import api from "@/core/api/axios";

// ── Resolved-buffer cache ───────────────────────────────────────────────────
// Two-tier cache: in-flight Promises + already-resolved byte arrays.
// Store as Uint8Array so we can safely slice a copy for each caller —
// PDF.js transfers the underlying ArrayBuffer to its worker (detaching it),
// so we must never hand out the cached buffer directly.
const inflightCache = new Map<string, Promise<Uint8Array>>();
const resolvedCache = new Map<string, Uint8Array>();

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

function looksLikePdf(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 5) return false;
  const view = bytes.subarray(0, Math.min(bytes.byteLength, 1024));
  for (let i = 0; i <= view.length - 4; i++) {
    if (
      view[i] === 0x25 && // %
      view[i + 1] === 0x50 && // P
      view[i + 2] === 0x44 && // D
      view[i + 3] === 0x46    // F
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Fetch drawing/media bytes with auth (falls back to plain fetch).
 * Results are cached as Uint8Array — resolved buffers are never re-downloaded.
 * Concurrent fetches are capped at MAX_CONCURRENT.
 * Returns a FRESH COPY each call so callers cannot detach the cached bytes.
 */
export function fetchDrawingArrayBuffer(fileUrl: string): Promise<ArrayBuffer> {
  // 1. Already resolved → return a fresh copy so callers cannot detach the cache
  const resolved = resolvedCache.get(fileUrl);
  if (resolved) return Promise.resolve(resolved.buffer.slice(resolved.byteOffset, resolved.byteOffset + resolved.byteLength));

  // 2. In-flight → reuse the same promise, then copy on resolve
  const inflight = inflightCache.get(fileUrl);
  if (inflight) return inflight.then((u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));

  // 3. New fetch — wait for a concurrency slot
  const promise = (async () => {
    await acquireSlot();
    try {
      let buffer: ArrayBuffer;
      try {
        // Media endpoints must not send Accept: application/json (axios default).
        const res = await api.get<ArrayBuffer>(fileUrl, {
          responseType: "arraybuffer",
          skipErrorToast: true,
          headers: {
            Accept: "*/*",
            "Content-Type": undefined,
          },
        });
        buffer = res.data;
      } catch {
        const rawRes = await fetch(fileUrl, {
          credentials: "include",
          headers: { Accept: "*/*" },
        });
        if (!rawRes.ok) {
          throw new Error(`HTTP ${rawRes.status} fetching drawing: ${fileUrl}`);
        }
        buffer = await rawRes.arrayBuffer();
      }
      // Store as Uint8Array so the cache entry can never be detached
      const cached = new Uint8Array(buffer);
      resolvedCache.set(fileUrl, cached);
      inflightCache.delete(fileUrl);
      return cached;
    } catch (error) {
      inflightCache.delete(fileUrl);
      throw error;
    } finally {
      releaseSlot();
    }
  })();

  inflightCache.set(fileUrl, promise);
  return promise.then((u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
}

/** Load PDF bytes for react-pdf `Document` (`{ data }`). Rejects non-PDF payloads. */
export async function fetchDrawingPdfData(fileUrl: string): Promise<Uint8Array> {
  // fetchDrawingArrayBuffer already returns a fresh copy each call
  const buffer = await fetchDrawingArrayBuffer(fileUrl);
  const bytes = new Uint8Array(buffer);
  if (!looksLikePdf(bytes)) {
    throw new Error(`Response is not a PDF: ${fileUrl}`);
  }
  // Return a fresh copy — PDF.js will transfer the underlying ArrayBuffer to its
  // worker (detaching it). The cache holds its own independent Uint8Array so
  // subsequent renders are not affected.
  return bytes;
}

