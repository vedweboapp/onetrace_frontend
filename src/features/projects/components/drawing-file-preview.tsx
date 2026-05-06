"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";
import { cn } from "@/core/utils/http.util";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function isPdfFile(file: string, fileType?: string | null): boolean {
  if (fileType?.toLowerCase().includes("pdf")) return true;
  return /\.pdf(\?|#|$)/i.test(file);
}

function isImageFile(file: string, fileType?: string | null): boolean {
  if (fileType?.toLowerCase().startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(file);
}

type Props = {
  drawingFile: string;
  fileType?: string | null;
  alt: string;
  /** PDF first page render width (px). Should match the layout width for sharpness. */
  widthPx: number;
  className?: string;
};

export function DrawingFilePreview({ drawingFile, fileType, alt, widthPx, className }: Props) {
  const url = React.useMemo(() => resolveDrawingFileUrl(drawingFile), [drawingFile]);
  const [failed, setFailed] = React.useState(false);

  const showFallback = !url || failed;

  const shell = (child: React.ReactNode) => (
    <span
      className={cn(
        "relative flex shrink-0 items-start justify-center overflow-hidden bg-slate-100 dark:bg-slate-900/80",
        className,
      )}
    >
      {child}
    </span>
  );

  if (showFallback) {
    return shell(
      <span className="flex size-full min-h-9 min-w-9 items-center justify-center">
        <FileText className="size-[55%] max-h-8 text-slate-300 dark:text-slate-600" strokeWidth={1.25} aria-hidden />
      </span>,
    );
  }

  if (isPdfFile(drawingFile, fileType)) {
    return shell(
      <Document file={url} onLoadError={() => setFailed(true)} className="flex justify-center">
        <Page
          pageNumber={1}
          width={widthPx}
          renderAnnotationLayer={false}
          renderTextLayer={false}
        />
      </Document>,
    );
  }

  if (isImageFile(drawingFile, fileType)) {
    return shell(
      // Drawing files use dynamic API/media URLs; next/image would require remotePatterns per deployment.
      // eslint-disable-next-line @next/next/no-img-element -- dynamic drawing preview URL
      <img
        src={url}
        alt={alt}
        className="h-full w-full object-cover object-top"
        loading="lazy"
        onError={() => setFailed(true)}
      />,
    );
  }

  return shell(
    // eslint-disable-next-line @next/next/no-img-element -- dynamic drawing preview URL
    <img
      src={url}
      alt={alt}
      className="h-full w-full object-cover object-top"
      loading="lazy"
      onError={() => setFailed(true)}
    />,
  );
}

type FillProps = {
  drawingFile: string;
  fileType?: string | null;
  alt: string;
  className?: string;
};

/**
 * Fills the parent (use inside a sized / aspect-ratio container). PDF first page scales to container width.
 */
export function DrawingFilePreviewFill({ drawingFile, fileType, alt, className }: FillProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(320);

  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setW(Math.max(64, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={cn("relative size-full min-h-0 min-w-0 overflow-hidden", className)}>
      <DrawingFilePreview
        drawingFile={drawingFile}
        fileType={fileType}
        alt={alt}
        widthPx={w}
        className="size-full"
      />
    </div>
  );
}
