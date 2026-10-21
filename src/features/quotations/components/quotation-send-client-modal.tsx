"use client";

import * as React from "react";
import { Check, FileText, Loader2, Send } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import {
  fetchQuotation,
  fetchQuotationTemplatesDropdown,
  sendQuotation,
  updateQuotation,
  type QuotationTemplateOption,
} from "@/features/quotations/api/quotation.api";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal } from "@/shared/ui";

type Props = {
  open: boolean;
  quotationId: number;
  quoteName?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function QuotationSendClientModal({
  open,
  quotationId,
  quoteName,
  onClose,
  onSuccess,
}: Props) {
  const [templates, setTemplates] = React.useState<QuotationTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<number | null>(null);
  const [html, setHtml] = React.useState<string | null>(null);
  const [pageWidth, setPageWidth] = React.useState<string | null>("8.27in");
  const [pageHeight, setPageHeight] = React.useState<string | null>("11.69in");

  const [loadingInitial, setLoadingInitial] = React.useState(false);
  const [updatingTemplate, setUpdatingTemplate] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load initial templates and current quotation details on modal open
  React.useEffect(() => {
    if (!open) {
      setTemplates([]);
      setSelectedTemplateId(null);
      setHtml(null);
      setErrorMsg(null);
      setLoadingInitial(false);
      setUpdatingTemplate(false);
      setSending(false);
      return;
    }

    let cancelled = false;
    setLoadingInitial(true);
    setErrorMsg(null);

    (async () => {
      try {
        const [templatesList, quoteDetail] = await Promise.all([
          fetchQuotationTemplatesDropdown(),
          fetchQuotation(quotationId, { include: ["html"] }),
        ]);

        if (cancelled) return;

        setTemplates(templatesList);

        if (quoteDetail.page_width) setPageWidth(quoteDetail.page_width);
        if (quoteDetail.page_height) setPageHeight(quoteDetail.page_height);

        const currentTid =
          typeof quoteDetail.template === "number"
            ? quoteDetail.template
            : quoteDetail.template && typeof quoteDetail.template === "object"
            ? (quoteDetail.template as { id?: number }).id ?? null
            : null;

        const initialHtml = quoteDetail.html_string || quoteDetail.html || null;

        if (currentTid != null) {
          setSelectedTemplateId(currentTid);
          setHtml(initialHtml);
        } else if (templatesList.length > 0) {
          // If no template assigned yet, default to the first one and persist it
          const firstTid = templatesList[0].id;
          setSelectedTemplateId(firstTid);
          try {
            await updateQuotation(quotationId, { template: firstTid });
            const refreshed = await fetchQuotation(quotationId, {
              include: ["html"],
            });
            if (!cancelled) {
              setHtml(refreshed.html_string || refreshed.html || null);
              if (refreshed.page_width) setPageWidth(refreshed.page_width);
              if (refreshed.page_height) setPageHeight(refreshed.page_height);
            }
          } catch {
            if (!cancelled) {
              setHtml(initialHtml);
            }
          }
        } else {
          setHtml(initialHtml);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Failed to load quotation details");
        }
      } finally {
        if (!cancelled) {
          setLoadingInitial(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, quotationId]);

  // Handle template selection change
  async function handleSelectTemplate(newTemplateId: number) {
    if (newTemplateId === selectedTemplateId || updatingTemplate || sending) return;

    setUpdatingTemplate(true);
    setSelectedTemplateId(newTemplateId);

    try {
      await updateQuotation(quotationId, { template: newTemplateId });
      const refreshed = await fetchQuotation(quotationId, {
        include: ["html"],
      });
      setHtml(refreshed.html_string || refreshed.html || null);
      if (refreshed.page_width) setPageWidth(refreshed.page_width);
      if (refreshed.page_height) setPageHeight(refreshed.page_height);
      toastSuccess("Template updated");
    } catch (err) {
      toastApiError(err, "Failed to update quotation template");
    } finally {
      setUpdatingTemplate(false);
    }
  }

  // Handle sending to client
  async function handleSend() {
    setSending(true);
    try {
      await sendQuotation(quotationId, { notification_send_to: "client" });
      toastSuccess("Quotation sent to client successfully");
      onSuccess?.();
      onClose();
    } catch (err) {
      toastApiError(err, "Failed to send quotation to client");
    } finally {
      setSending(false);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const busy = loadingInitial || updatingTemplate || sending;

  const fullHtmlDocument = React.useMemo(() => {
    if (!html) return "";
    const width = pageWidth || "8.27in";
    const minHeight = pageHeight || "11.69in";

    const sharedStyles = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .page-sheet {
      margin: 20px auto;
      background: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
      border-radius: 4px;
      max-width: ${width};
      min-height: ${minHeight};
      padding: 40px;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    table.pcs-itemtable {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 12px;
    }
    table.pcs-itemtable th {
      background-color: #3c3d3a;
      color: #ffffff;
      padding: 8px;
      border: 1px solid #ddd;
      font-weight: 600;
      text-align: left;
    }
    table.pcs-itemtable td {
      padding: 8px;
      border: 1px solid #ddd;
    }
    table.borderless-table,
    table[data-borderless="true"],
    table:has(td.borderless-cell),
    table:has(td[data-borderless="true"]) {
      width: 100% !important;
      border-collapse: collapse !important;
      border: none !important;
      margin: 0.5rem 0 !important;
    }
    table.borderless-table td,
    table.borderless-table th,
    table[data-borderless="true"] td,
    table[data-borderless="true"] th,
    td.borderless-cell,
    td[data-borderless="true"] {
      border: none !important;
      outline: none !important;
      padding: 4px 10px !important;
      vertical-align: top !important;
    }
    p { margin: 0 0 0.5em 0; }
    img { max-width: 100%; height: auto; }
    `;

    // Ensure all tables (including borderless header tables) expand to 100% width
    let processedHtml = html.replace(/<table\b([^>]*)>/gi, (match, attrs) => {
      if (attrs.includes("style=")) {
        return match.replace(/style="([^"]*)"/i, (_sMatch, styleVal) => {
          let updated = styleVal;
          if (!/width\s*:/i.test(updated)) {
            updated = `width: 100%; ${updated}`.trim();
          }
          return `style="${updated}"`;
        });
      } else {
        return `<table${attrs} style="width: 100%;">`;
      }
    });

    if (processedHtml.includes("<html") || processedHtml.includes("<!DOCTYPE")) {
      if (processedHtml.includes("</head>")) {
        return processedHtml.replace("</head>", `<style>${sharedStyles}</style></head>`);
      }
      return `<style>${sharedStyles}</style>${processedHtml}`;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
${sharedStyles}
  </style>
</head>
<body>
  <div class="page-sheet">
    ${processedHtml}
  </div>
</body>
</html>`;
  }, [html, pageWidth, pageHeight]);

  return (
    <AppModal
      open={open}
      onClose={() => (!busy ? onClose() : undefined)}
      title="Send Quotation to Client"
      size="4xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {selectedTemplate ? (
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                <Check className="size-3.5 text-emerald-500" />
                Template: {selectedTemplate.name}
              </span>
            ) : (
              <span>Please select a template</span>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={sending}
              disabled={busy || !selectedTemplateId}
              onClick={() => void handleSend()}
              className="inline-flex items-center gap-1.5"
            >
              <Send className="size-3.5" />
              <span>Send to Client</span>
            </AppButton>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {quoteName ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose the template to generate the quotation document for{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{quoteName}</span>{" "}
            and review the preview before sending to the client.
          </p>
        ) : null}

        {/* Template Selector Bar */}
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-blue-600 dark:text-blue-400" />
            <label
              htmlFor="quotation-template-select"
              className="text-xs font-semibold text-slate-800 dark:text-slate-100"
            >
              Quotation Template:
            </label>
          </div>

          <div className="flex items-center gap-2">
            {loadingInitial ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Loading templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <span className="text-xs text-slate-400">No quotation templates found</span>
            ) : (
              <select
                id="quotation-template-select"
                value={selectedTemplateId != null ? String(selectedTemplateId) : ""}
                onChange={(e) => void handleSelectTemplate(Number(e.target.value))}
                disabled={updatingTemplate || sending}
                className={cn(
                  "h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
                  "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400",
                  (updatingTemplate || sending) && "cursor-not-allowed opacity-60",
                )}
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            )}

            {updatingTemplate ? (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                <Loader2 className="size-3.5 animate-spin" />
                <span className="hidden sm:inline">Updating...</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Error State */}
        {errorMsg ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMsg}
          </div>
        ) : null}

        {/* Document Preview Area */}
        <div className="relative min-h-[450px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
          {loadingInitial || updatingTemplate ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[1px] dark:bg-slate-950/70">
              <Loader2 className="size-6 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {loadingInitial
                  ? "Loading quotation and template..."
                  : "Rendering updated template preview..."}
              </span>
            </div>
          ) : null}

          {html ? (
            <iframe
              srcDoc={fullHtmlDocument}
              title="Quotation Template Preview"
              className="h-[520px] w-full border-0 bg-white shadow-inner"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex h-[520px] flex-col items-center justify-center gap-2 text-center text-slate-400">
              <FileText className="size-8 stroke-1 text-slate-300 dark:text-slate-600" />
              <p className="text-xs">
                {loadingInitial
                  ? "Loading document preview..."
                  : "No preview generated yet. Please select a template above."}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppModal>
  );
}
