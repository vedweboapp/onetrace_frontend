"use client";

import * as React from "react";
import { fetchDrawingPdfData } from "@/features/projects/utils/drawing-file-bytes.util";

type PdfFileSource = { data: Uint8Array };

/**
 * Load a drawing PDF with auth and return a react-pdf `file` source.
 * Avoids InvalidPDFException from HTML/JSON error pages fetched without a token.
 */
export function useAuthenticatedPdfFile(url: string | null | undefined, enabled = true) {
  const [file, setFile] = React.useState<PdfFileSource | null>(null);
  const [loading, setLoading] = React.useState(Boolean(enabled && url));
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFile(null);
    setFailed(false);

    if (!enabled || !url) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchDrawingPdfData(url)
      .then((data) => {
        if (!cancelled) {
          setFile({ data });
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, enabled]);

  return { file, loading, failed };
}
