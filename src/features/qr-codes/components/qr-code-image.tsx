"use client";

import * as React from "react";
import QRCode from "qrcode";
import { cn } from "@/core/utils/http.util";

type Props = {
  /** The URL or text to encode in the QR code. */
  value: string;
  /** Size in pixels (width & height). Default 192. */
  size?: number;
  className?: string;
};

export function QrCodeImage({ value, size = 192, className }: Props) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900",
          className,
        )}
        style={{ width: size, height: size }}
      >
        QR
      </div>
    );
  }

  return (
    <a href={value} target="_blank" rel="noopener noreferrer" title={value}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={`QR: ${value}`}
        className={cn(
          "shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-2 dark:border-slate-700 dark:bg-slate-950",
          className,
        )}
        style={{ width: size, height: size }}
      />
    </a>
  );
}
