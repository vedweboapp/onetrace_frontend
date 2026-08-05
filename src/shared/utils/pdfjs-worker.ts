import { pdfjs } from "react-pdf";

/**
 * Configure PDF.js worker once for react-pdf / pdf snapshot usage.
 * Uses unpkg CDN matching pdfjs.version to avoid Next.js asset 404 routing errors.
 */
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export { pdfjs };

