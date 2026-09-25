import type { JobMapPin } from "@/features/jobs/utils/job-site-map.util";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Compact Google Maps–style hover card: title + address (+ optional status). */
export function buildJobPinHoverCardHtml(
  pin: Pick<JobMapPin, "jobId" | "jobLabel" | "addressText" | "statusLabel" | "statusColor">,
): string {
  const title = escapeHtml(pin.jobLabel || `Job #${pin.jobId}`);
  const address = escapeHtml(pin.addressText?.trim() || "—");
  const status = pin.statusLabel?.trim()
    ? escapeHtml(pin.statusLabel.trim())
    : "";
  const statusColor = pin.statusColor?.trim() || "#64748b";

  const statusHtml = status
    ? `<div style="
        margin-top:8px;
        display:inline-flex;
        align-items:center;
        gap:6px;
        max-width:100%;
        padding:3px 8px;
        border-radius:999px;
        background:${escapeHtml(statusColor)}22;
        color:#202124;
        font-size:11px;
        font-weight:600;
        line-height:1.2;
      ">
        <span style="
          width:8px;height:8px;border-radius:999px;flex-shrink:0;
          background:${escapeHtml(statusColor)};
        "></span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${status}</span>
      </div>`
    : "";

  return `
    <div class="ot-job-pin-card ot-job-pin-hover-card" data-job-id="${pin.jobId}" style="
      box-sizing:border-box;
      width:min(260px,78vw);
      margin:0;
      padding:12px 14px;
      font-family:Roboto,system-ui,-apple-system,Segoe UI,sans-serif;
      background:#fff;
      color:#202124;
      border-radius:12px;
    ">
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
      ${statusHtml}
    </div>
  `;
}

/** @deprecated Prefer buildJobPinHoverCardHtml for hover; click opens the side panel. */
export function buildJobPinPopupHtml(
  pin: Pick<JobMapPin, "jobId" | "jobLabel" | "addressText" | "statusLabel" | "statusColor">,
  _opts?: { openAriaLabel?: string },
): string {
  return buildJobPinHoverCardHtml(pin);
}
