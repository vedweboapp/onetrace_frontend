"use client";

import * as React from "react";
import { Download, Loader2, FileText, AlertCircle } from "lucide-react";
import api from "@/core/api/axios";
import { resolveBackendOrigin } from "@/core/config/api-url.util";
import {
  filenameFromContentDisposition,
  triggerBlobDownload,
} from "@/shared/mass-actions/mass-action.util";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal } from "@/shared/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: number;
  submissionId: number;
  formName?: string | null;
  locationLabel?: string | null;
};

async function downloadPdfFromUrl(pdfUrl: string, fallbackFilename: string) {
  let filename = fallbackFilename;
  try {
    const urlObj = new URL(pdfUrl, typeof window !== "undefined" ? window.location.href : undefined);
    const pathnameParts = urlObj.pathname.split("/").filter(Boolean);
    const lastPart = pathnameParts[pathnameParts.length - 1];
    if (lastPart && lastPart.toLowerCase().endsWith(".pdf")) {
      filename = decodeURIComponent(lastPart);
    }
  } catch {
    // keep fallbackFilename
  }

  // Try relative proxy path first (e.g. /backend/media/...) to prevent CORS blocks on local dev, then absolute URL
  const candidateUrls: string[] = [];
  try {
    const parsed = new URL(pdfUrl, typeof window !== "undefined" ? window.location.href : undefined);
    if (parsed.pathname.startsWith("/backend/media/") || parsed.pathname.startsWith("/media/")) {
      candidateUrls.push(`${parsed.pathname}${parsed.search}`);
    }
  } catch {
    // ignore
  }
  candidateUrls.push(pdfUrl);

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        triggerBlobDownload(blob, filename);
        return;
      }
    } catch {
      // try next candidate
    }
  }

  // Fallback: direct anchor trigger or new window
  try {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    window.open(pdfUrl, "_blank");
  }
}

export function DoorSurveyPdfPreviewModal({
  open,
  onClose,
  projectId,
  submissionId,
  formName,
  locationLabel,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [html, setHtml] = React.useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  // Fetch preview when modal opens
  React.useEffect(() => {
    if (!open) {
      setHtml(null);
      setPdfUrl(null);
      setError(null);
      setLoading(false);
      setDownloading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await api.post<{
          success?: boolean;
          message?: string;
          data?: {
            pdf_url?: string;
            url?: string;
            html?: string;
            html_string?: string;
            rendered_html?: string;
            template_html?: string;
            preview_html?: string;
            [key: string]: unknown;
          };
          html?: string;
          html_string?: string;
        }>(
          "door-survey/export-pdf/?include=html",
          {
            project_id: projectId,
            submission_ids: [submissionId],
          },
        );

        if (cancelled) return;

        const respData = response?.data;
        if (respData && respData.success === false) {
          throw new Error(respData.message || "Failed to load preview");
        }

        const rawHtml =
          respData?.data?.html ||
          respData?.data?.html_string ||
          respData?.data?.rendered_html ||
          respData?.data?.template_html ||
          respData?.data?.preview_html ||
          respData?.html ||
          respData?.html_string ||
          null;

        const url = respData?.data?.pdf_url || respData?.data?.url || null;

        setHtml(rawHtml);
        setPdfUrl(url);

        if (!rawHtml && !url) {
          throw new Error("No preview content returned by server");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load document preview");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, projectId, submissionId]);

  // Construct iframe document
  const renderedDoc = React.useMemo(() => {
    if (!html) return "";

    const backendOrigin = resolveBackendOrigin();
    const baseTag = `<base href="${backendOrigin}/" target="_blank" />`;
    const sharedStyles = `
      *, *::before, *::after { box-sizing: border-box; }
      html, body {
        margin: 0; padding: 0;
        background-color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        -webkit-font-smoothing: antialiased;
      }
      .page-sheet {
        margin: 20px auto;
        background: #ffffff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
        border-radius: 4px;
        max-width: 8.27in;
        min-height: 11.69in;
        
        line-height: 1.5;
      }
      table { width: 100%; border-collapse: collapse; }
      table th, table td { padding: 6px 8px; border: 1px solid #e2e8f0; }
      table.borderless-table, table[data-borderless="true"],
      table:has(td.borderless-cell), table:has(td[data-borderless="true"]),
      table:has(td[colwidth]), table:has(th[colwidth]) {
        width: 100% !important; border-collapse: collapse !important;
        border: none !important; margin: 0.5rem 0 !important; table-layout: fixed !important;
      }
      table.borderless-table td, table.borderless-table th,
      table[data-borderless="true"] td, table[data-borderless="true"] th,
      td.borderless-cell, td[data-borderless="true"] {
        border: none !important; outline: none !important; padding: 4px 10px !important;
        vertical-align: middle !important; box-sizing: border-box !important;
      }
      img { max-width: 100%; height: auto; display: block; }
      p { margin: 0 0 0.5em 0; }
    `;

    if (html.includes("<html") || html.includes("<!DOCTYPE")) {
      return html.includes("</head>")
        ? html.replace("</head>", `${baseTag}<style>${sharedStyles}</style></head>`)
        : `${baseTag}<style>${sharedStyles}</style>${html}`;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${baseTag}
  <style>${sharedStyles}</style>
</head>
<body>
  <div>${html}</div>
</body>
</html>`;
  }, [html]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await api.post<{
        success?: boolean;
        message?: string;
        data?: { pdf_url?: string; url?: string; [key: string]: unknown };
      }>("door-survey/export-pdf/", {
        project_id: projectId,
        submission_ids: [submissionId],
      });
      const respData = response?.data;
      if (respData && respData.success === false) {
        throw new Error(respData.message || "Failed to generate PDF");
      }
      const targetUrl = respData?.data?.pdf_url || respData?.data?.url || null;
      if (!targetUrl) {
        throw new Error("PDF URL not available to download");
      }
      const fallbackName = `${formName || "submission"}_${submissionId}.pdf`;
      await downloadPdfFromUrl(targetUrl, fallbackName);
      toastSuccess("PDF downloaded successfully");
    } catch (err) {
      toastApiError(err, "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const titleText = formName ? `${formName} Preview` : "Document Preview";

  return (
    <AppModal
      open={open}
      onClose={() => (!downloading ? onClose() : undefined)}
      title={
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-blue-600 dark:text-blue-400" />
          <span>{titleText}</span>
        </div>
      }
      description={locationLabel ? `Location: ${locationLabel}` : undefined}
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={downloading}
            onClick={onClose}
          >
            Close
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={downloading}
            disabled={loading || Boolean(error)}
            onClick={() => void handleDownload()}
            className="inline-flex items-center gap-1.5"
          >
            <Download className="size-3.5" />
            <span>{downloading ? "Downloading..." : "Download PDF"}</span>
          </AppButton>
        </div>
      }
    >
      <div className="relative min-h-[500px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[1px] dark:bg-slate-950/70">
            <Loader2 className="size-6 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Loading document preview...
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="flex h-[500px] flex-col items-center justify-center gap-2 p-6 text-center">
            <AlertCircle className="size-8 text-rose-500" />
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Failed to load preview</p>
            <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">{error}</p>
          </div>
        ) : renderedDoc ? (
          <iframe
            srcDoc={renderedDoc}
            title="Door Survey PDF Preview"
            className="h-[580px] w-full rounded-md border-0 bg-white shadow-inner"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
        ) : !loading ? (
          <div className="flex h-[500px] flex-col items-center justify-center gap-2 text-center text-slate-400">
            <FileText className="size-8 stroke-1 text-slate-300 dark:text-slate-600" />
            <p className="text-xs">No preview available.</p>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
