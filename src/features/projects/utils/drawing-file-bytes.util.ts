import api from "@/core/api/axios";

const bytesCache = new Map<string, Promise<ArrayBuffer>>();

function looksLikePdf(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const header = new Uint8Array(buffer.slice(0, 5));
  return (
    header[0] === 0x25 && // %
    header[1] === 0x50 && // P
    header[2] === 0x44 && // D
    header[3] === 0x46 // F
  );
}

/** Fetch drawing/media bytes with auth (falls back to plain fetch). Cached by URL. */
export function fetchDrawingArrayBuffer(fileUrl: string): Promise<ArrayBuffer> {
  const existing = bytesCache.get(fileUrl);
  if (existing) return existing;

  const promise = (async () => {
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
  })().catch((error) => {
    bytesCache.delete(fileUrl);
    throw error;
  });

  bytesCache.set(fileUrl, promise);
  return promise;
}

/** Load PDF bytes for react-pdf `Document` (`{ data }`). Rejects non-PDF payloads. */
export async function fetchDrawingPdfData(fileUrl: string): Promise<Uint8Array> {
  const buffer = await fetchDrawingArrayBuffer(fileUrl);
  if (!looksLikePdf(buffer)) {
    throw new Error(`Response is not a PDF: ${fileUrl}`);
  }
  return new Uint8Array(buffer);
}
