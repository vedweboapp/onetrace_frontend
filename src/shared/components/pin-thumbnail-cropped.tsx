"use client";

import * as React from "react";
import { pinThumbnailCropLimiter } from "@/shared/utils/concurrency-limit.util";

import { cn } from "@/core/utils/http.util";

// Module-level cache: snapshot URL → loaded HTMLImageElement
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function getOrLoadImage(url: string): Promise<HTMLImageElement> {
  const existing = imageCache.get(url);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      imageCache.delete(url);
      reject(new Error("Failed to load snapshot image"));
    };
    img.src = url;
  });

  imageCache.set(url, promise);
  return promise;
}

function TinyPin({ color }: { color: string }) {
  return (
    <svg
      width="7"
      height="9"
      viewBox="0 0 7 9"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
      aria-hidden
    >
      <circle cx="3.5" cy="3.5" r="2.75" fill="white" stroke={color} strokeWidth="1.25" />
      <path d="M3.5 8.25L2.6 6.35H4.4L3.5 8.25Z" fill={color} />
    </svg>
  );
}

type Props = {
  snapshotUrl: string;
  snapshotWidth: number;
  snapshotHeight: number;
  xPercent: number;
  yPercent: number;
  marginFraction?: number;
  pinColor?: string;
  className?: string;
  alt?: string;
};

export function PinThumbnailCropped({
  snapshotUrl,
  snapshotWidth,
  snapshotHeight,
  xPercent,
  yPercent,
  marginFraction = 0.15,
  pinColor = "#f97316",
  className,
  alt = "",
}: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [pinPos, setPinPos] = React.useState<{ left: number; top: number } | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const img = await getOrLoadImage(snapshotUrl);
        if (cancelled) return;

        const bitmap = await pinThumbnailCropLimiter(async () => {
          const smallerDim = Math.min(snapshotWidth, snapshotHeight);
          const cropSize = Math.round(smallerDim * marginFraction * 2);

          const cx = Math.round((xPercent / 100) * snapshotWidth);
          const cy = Math.round((yPercent / 100) * snapshotHeight);

          let sx = cx - Math.round(cropSize / 2);
          let sy = cy - Math.round(cropSize / 2);

          // Clamp to stay within image bounds
          sx = Math.max(0, Math.min(sx, snapshotWidth - cropSize));
          sy = Math.max(0, Math.min(sy, snapshotHeight - cropSize));

          const sw = Math.min(cropSize, snapshotWidth - sx);
          const sh = Math.min(cropSize, snapshotHeight - sy);

          if (sw <= 0 || sh <= 0) {
            throw new Error("Invalid crop dimensions");
          }

          // Calculate relative percentage position of the pin inside the cropped region
          const px = cx - sx;
          const py = cy - sy;
          const left = (px / sw) * 100;
          const top = (py / sh) * 100;

          if (!cancelled) {
            setPinPos({ left, top });
          }

          return createImageBitmap(img, sx, sy, sw, sh);
        });

        if (cancelled) {
          bitmap.close();
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
          bitmap.close();
          return;
        }

        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
        }
        bitmap.close();
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [snapshotUrl, snapshotWidth, snapshotHeight, xPercent, yPercent, marginFraction]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className={cn("size-full", status !== "ready" && "invisible")}
        style={{ objectFit: "cover" }}
        role="img"
        aria-label={alt}
      />
      {status === "ready" && pinPos && (
        <span
          className="absolute pointer-events-none"
          style={{
            left: `${pinPos.left}%`,
            top: `${pinPos.top}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <TinyPin color={pinColor} />
        </span>
      )}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">—</div>
      )}
    </div>
  );
}
