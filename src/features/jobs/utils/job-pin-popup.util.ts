import type { JobMapPin } from "@/features/jobs/utils/job-site-map.util";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Google Maps–style place card: title + address + top-right open action. */
export function buildJobPinPopupHtml(
  pin: Pick<JobMapPin, "jobId" | "jobLabel" | "addressText">,
  opts?: { openAriaLabel?: string },
): string {
  const title = escapeHtml(pin.jobLabel || `Job #${pin.jobId}`);
  const address = escapeHtml(pin.addressText?.trim() || "—");
  const openAria = escapeHtml(opts?.openAriaLabel ?? "Open details");

  return `
    <div class="ot-job-pin-card" data-job-id="${pin.jobId}" style="
      box-sizing:border-box;
      width:min(280px,78vw);
      margin:0;
      padding:12px 12px 12px 14px;
      font-family:Roboto,system-ui,-apple-system,Segoe UI,sans-serif;
      background:#fff;
      color:#202124;
    ">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="min-width:0;flex:1;">
          <div style="
            font-size:14px;
            font-weight:600;
            line-height:1.25;
            color:#202124;
            letter-spacing:-0.01em;
          ">${title}</div>
          <div style="
            margin-top:4px;
            font-size:12px;
            font-weight:400;
            line-height:1.4;
            color:#70757a;
            word-break:break-word;
          ">${address}</div>
        </div>
        <button
          type="button"
          class="ot-job-map-details"
          data-job-id="${pin.jobId}"
          data-job-details="${pin.jobId}"
          title="${openAria}"
          aria-label="${openAria}"
          style="
            flex-shrink:0;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            width:36px;
            height:36px;
            margin:0;
            padding:0;
            border:0;
            border-radius:8px;
            background:#1a73e8;
            color:#fff;
            cursor:pointer;
            box-shadow:0 1px 2px rgba(60,64,67,.3),0 1px 3px 1px rgba(60,64,67,.15);
          "
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 3h7v7" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 14L21 3" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}
