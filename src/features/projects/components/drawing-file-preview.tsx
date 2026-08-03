"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { Document, Page } from "react-pdf";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";
import { fetchDrawingPdfData } from "@/features/projects/utils/drawing-file-bytes.util";
import { cn } from "@/core/utils/http.util";
import "@/shared/utils/pdfjs-worker";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

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
  /** Called with (width / height) once the file's natural dimensions are known. */
  onNaturalAspect?: (ar: number) => void;
};

export function DrawingFilePreview({ drawingFile, fileType, alt, widthPx, className, onNaturalAspect }: Props) {
  const url = React.useMemo(() => resolveDrawingFileUrl(drawingFile), [drawingFile]);
  const isPdf = isPdfFile(drawingFile, fileType);
  const [failed, setFailed] = React.useState(false);
  const [pdfData, setPdfData] = React.useState<Uint8Array | null>(null);
  const [pdfLoading, setPdfLoading] = React.useState(isPdf && Boolean(url));

  React.useEffect(() => {
    setFailed(false);
    setPdfData(null);

    if (!url || !isPdf) {
      setPdfLoading(false);
      return;
    }

    let cancelled = false;
    setPdfLoading(true);

    fetchDrawingPdfData(url)
      .then((data) => {
        if (!cancelled) {
          setPdfData(data);
          setPdfLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setPdfLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, isPdf]);

  const showFallback = !url || failed || (isPdf && !pdfLoading && !pdfData);

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

  if (isPdf) {
    if (pdfLoading || !pdfData) {
      return shell(
        <span className="flex size-full min-h-9 min-w-9 items-center justify-center">
          <span className="size-[40%] max-h-6 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </span>,
      );
    }

    return shell(
      <Document
        file={{ data: pdfData }}
        onLoadError={() => setFailed(true)}
        loading={null}
        error={null}
        className="flex justify-center"
      >
        <Page
          pageNumber={1}
          width={widthPx}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          onRenderSuccess={(page) => {
            if (onNaturalAspect && page.width > 0 && page.height > 0) {
              onNaturalAspect(page.width / page.height);
            }
          }}
        />
      </Document>,
    );
  }

  if (isImageFile(drawingFile, fileType)) {
    return shell(
      <img
        src={url}
        alt={alt}
        className="h-full w-full object-cover object-top"
        loading="lazy"
        onError={() => setFailed(true)}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (onNaturalAspect && img.naturalWidth > 0 && img.naturalHeight > 0) {
            onNaturalAspect(img.naturalWidth / img.naturalHeight);
          }
        }}
      />,
    );
  }

  return shell(
    <img
      src={url}
      alt={alt}
      className="h-full w-full object-cover object-top"
      loading="lazy"
      onError={() => setFailed(true)}
      onLoad={(e) => {
        const img = e.currentTarget;
        if (onNaturalAspect && img.naturalWidth > 0 && img.naturalHeight > 0) {
          onNaturalAspect(img.naturalWidth / img.naturalHeight);
        }
      }}
    />,
  );
}

type FillProps = {
  drawingFile: string;
  fileType?: string | null;
  alt: string;
  className?: string;
  /** Called with (width / height) once the file's natural dimensions are known. */
  onNaturalAspect?: (ar: number) => void;
};

/**
 * Fills the parent (use inside a sized / aspect-ratio container). PDF first page scales to container width.
 */
export function DrawingFilePreviewFill({ drawingFile, fileType, alt, className, onNaturalAspect }: FillProps) {
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
        onNaturalAspect={onNaturalAspect}
      />
    </div>
  );
}
