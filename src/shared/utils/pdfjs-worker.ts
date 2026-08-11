import type { pdfjs as PdfJsType } from "react-pdf";

// Polyfill DOMMatrix for Node.js SSR environment if pdfjs-dist is loaded on server
if (typeof window === "undefined" && typeof globalThis !== "undefined" && !(globalThis as any).DOMMatrix) {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor() {}
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
  };
}

let _pdfjsInstance: typeof PdfJsType | null = null;
let _configured = false;

function initPdfJsBrowser(): typeof PdfJsType | null {
  if (typeof window === "undefined") return null;
  if (!_pdfjsInstance) {
    try {
      // Synchronously require react-pdf in browser context
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { pdfjs } = require("react-pdf");
      _pdfjsInstance = pdfjs;
    } catch {
      return null;
    }
  }
  if (_pdfjsInstance && !_configured) {
    _pdfjsInstance.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${_pdfjsInstance.version}/build/pdf.worker.min.mjs`;
    _configured = true;
  }
  return _pdfjsInstance;
}

export async function getPdfjs(): Promise<typeof PdfJsType> {
  if (typeof window === "undefined") {
    throw new Error("PDF.js is only available in browser environment.");
  }
  if (!_pdfjsInstance) {
    const { pdfjs } = await import("react-pdf");
    _pdfjsInstance = pdfjs;
  }
  if (_pdfjsInstance && !_configured) {
    _pdfjsInstance.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${_pdfjsInstance.version}/build/pdf.worker.min.mjs`;
    _configured = true;
  }
  return _pdfjsInstance;
}

/**
 * Configure PDF.js worker once for react-pdf / pdf snapshot usage.
 * Uses unpkg CDN matching pdfjs.version to avoid Next.js asset 404 routing errors.
 */
export const pdfjs = new Proxy({} as typeof PdfJsType, {
  get(_target, prop) {
    if (typeof window === "undefined") {
      return undefined;
    }
    const instance = initPdfJsBrowser();
    return instance ? (instance as any)[prop] : undefined;
  },
});
