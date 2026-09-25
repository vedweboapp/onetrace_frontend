/**
 * Converts a base64 signature data URL (as produced by SignaturePad) into a
 * File object suitable for appending to FormData.
 *
 * Usage:
 *   const file = await signatureDataUrlToFile(values.signature);
 *   if (file) formData.append("signature", file, file.name);
 *
 * @param dataUrl  The base64 data URL string from SignaturePad (e.g. "data:image/png;base64,...")
 * @param fileName Optional file name. Defaults to "signature.png".
 * @returns        A File if dataUrl is non-empty, otherwise null.
 */
export async function signatureDataUrlToFile(
  dataUrl: string | null | undefined,
  fileName = "signature.png",
): Promise<File | null> {
  if (!dataUrl) return null;

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || "image/png" });
}

/**
 * Synchronous alternative using atob — no network round-trip.
 * Prefer this when you're certain the value is a base64 data URL.
 *
 * @param dataUrl  The base64 data URL string from SignaturePad.
 * @param fileName Optional file name. Defaults to "signature.png".
 * @returns        A File if dataUrl is non-empty, otherwise null.
 */
export function signatureDataUrlToFileSync(
  dataUrl: string | null | undefined,
  fileName = "signature.png",
): File | null {
  if (!dataUrl) return null;

  // Strip the "data:image/png;base64," prefix
  const [header, base64] = dataUrl.split(",");
  if (!header || !base64) return null;

  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? "image/png";

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], fileName, { type: mime });
}
