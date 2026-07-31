import { pdfjs } from "react-pdf";

/**
 * Configure PDF.js worker once for react-pdf / pdf snapshot usage.
 * pdfjs-dist must be a direct dependency so Next can resolve the worker file.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export { pdfjs };
