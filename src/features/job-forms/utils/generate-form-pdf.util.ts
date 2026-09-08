import type {
  JobFormSubmission,
  NormalizedFormField,
  NormalizedFormSection,
} from "@/features/job-forms/types/job-form-submission.types";
import type { FormRule } from "@/shared/form/formbuilder/form-rules.types";
import { buildFieldRuleState } from "@/shared/form/formbuilder/form-rules-engine";

export type FormPdfFileLink = {
  name: string;
  url: string;
  kind: "video" | "attachment" | "file";
};

export type FormPdfFieldItem = {
  index: number;
  label: string;
  fieldType: string;
  textValue?: string;
  imageUrls?: string[];
  fileLinks?: FormPdfFileLink[];
};

export type PinSidebarDetails = {
  location: string;
  productName: string;
  quantity: number | string;
  statusName: string;
  statusColor?: string;
  statusTextColor?: string;
  plotName: string;
  levelName: string;
  description: string;
  formName: string;
  variation: string;
  previewImageUrl?: string | null;
  attachments?: Array<{ name: string; url: string }>;
};

export type GenerateFormPdfOptions = {
  formTitle: string;
  formId?: number | string | null;
  locationText?: string | null;
  productName?: string | null;
  plotName?: string | null;
  levelName?: string | null;
  statusName?: string | null;
  submittedAt?: string | null;
  sections: NormalizedFormSection[];
  defaultValues: Record<string, unknown>;
  submission?: JobFormSubmission | null;
  pinDetails?: PinSidebarDetails;
  /** Form conditional rules — used to skip hidden fields/sections in the PDF */
  rules?: FormRule[];
};

function hexToRgb(hex: string): [number, number, number] {
  let c = (hex || "#10b981").replace("#", "").trim();
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (isNaN(num)) return [16, 185, 129];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function normalizeFileUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("data:")) {
    return trimmed.slice(0, 100);
  }
  return trimmed.split("?")[0].replace(/^https?:\/\/[^/]+/, "").toLowerCase();
}

function areUrlsEqual(urlA: string, urlB: string): boolean {
  if (urlA === urlB) return true;
  return normalizeFileUrl(urlA) === normalizeFileUrl(urlB);
}

function addUniqueImage(url: string, list: string[]): void {
  const trimmed = url.trim();
  if (!trimmed) return;
  if (!list.some((existing) => areUrlsEqual(existing, trimmed))) {
    list.push(trimmed);
  }
}

function addUniqueFileLink(link: FormPdfFileLink, list: FormPdfFileLink[]): void {
  if (!link.url) return;
  if (!list.some((existing) => areUrlsEqual(existing.url, link.url))) {
    list.push(link);
  }
}

function isDisplayableUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/")
  );
}

function isImageUrl(url: string, fieldType?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/")) return true;

  const clean = trimmed.split("?")[0].toLowerCase();
  if (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".svg") ||
    clean.endsWith(".bmp")
  ) {
    return true;
  }

  const type = String(fieldType ?? "").toLowerCase();
  if (type.includes("signature")) return true;

  if (
    (type.includes("image") || type.includes("photo") || type.includes("picture")) &&
    !isVideoUrl(url) &&
    !isDocumentUrl(url)
  ) {
    return true;
  }

  return false;
}

function isVideoUrl(url: string, fieldType?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim().split("?")[0].toLowerCase();
  if (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".avi") ||
    clean.endsWith(".mkv") ||
    clean.endsWith(".m4v") ||
    clean.endsWith(".wmv")
  ) {
    return true;
  }
  const type = String(fieldType ?? "").toLowerCase();
  return type.includes("video");
}

function isDocumentUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim().split("?")[0].toLowerCase();
  return (
    clean.endsWith(".pdf") ||
    clean.endsWith(".doc") ||
    clean.endsWith(".docx") ||
    clean.endsWith(".xls") ||
    clean.endsWith(".xlsx") ||
    clean.endsWith(".ppt") ||
    clean.endsWith(".pptx") ||
    clean.endsWith(".csv") ||
    clean.endsWith(".zip") ||
    clean.endsWith(".rar") ||
    clean.endsWith(".txt") ||
    clean.endsWith(".json")
  );
}

function getFileNameFromUrl(url: string, fallbackName?: string): string {
  if (fallbackName && fallbackName.trim() && fallbackName.trim() !== "No file added") {
    return fallbackName.trim();
  }
  try {
    const clean = url.split("?")[0];
    const segments = clean.split("/");
    const last = segments[segments.length - 1];
    if (last && last.includes(".")) {
      return decodeURIComponent(last);
    }
  } catch {
    // fallback
  }
  return "View Attachment";
}

function collectFieldFiles(
  value: unknown,
  fieldType?: string,
  intoImages: string[] = [],
  intoLinks: FormPdfFileLink[] = [],
): void {
  if (value == null || value === "") return;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed === "No file added" ||
      trimmed === "null" ||
      trimmed === "undefined" ||
      trimmed === ""
    ) {
      return;
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const item of parsed) collectFieldFiles(item, fieldType, intoImages, intoLinks);
          return;
        }
      } catch {
        // continue as string
      }
    }

    if (isDisplayableUrl(trimmed)) {
      if (isImageUrl(trimmed, fieldType)) {
        addUniqueImage(trimmed, intoImages);
      } else {
        addUniqueFileLink({
          name: getFileNameFromUrl(trimmed),
          url: trimmed,
          kind: isVideoUrl(trimmed, fieldType) ? "video" : "attachment",
        }, intoLinks);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFieldFiles(item, fieldType, intoImages, intoLinks);
    }
    return;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const url = (obj.file_url ?? obj.url ?? obj.file ?? obj.image ?? obj.data_url) as string | undefined;
    const name = (obj.name ?? obj.file_name ?? obj.label ?? obj.title) as string | undefined;

    if (typeof url === "string" && isDisplayableUrl(url)) {
      if (isImageUrl(url, fieldType)) {
        addUniqueImage(url.trim(), intoImages);
      } else {
        addUniqueFileLink({
          name: getFileNameFromUrl(url, name),
          url: url.trim(),
          kind: isVideoUrl(url, fieldType) ? "video" : "attachment",
        }, intoLinks);
      }
    }
  }
}

function formatNonImageValue(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (
      trimmed === "No file added" ||
      trimmed === "null" ||
      trimmed === "undefined" ||
      trimmed === ""
    ) {
      return "";
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => formatNonImageValue(item)).filter(Boolean).join(", ");
        }
      } catch {
        // use string as is
      }
    }
    return trimmed;
  }
  if (Array.isArray(val)) {
    return val.map((item) => formatNonImageValue(item)).filter(Boolean).join(", ");
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const name = obj.name ?? obj.label ?? obj.title ?? obj.value;
    if (typeof name === "string") return name.trim();
    return "";
  }
  return "";
}

function extractFieldValue(
  field: NormalizedFormField,
  defaultValues: Record<string, unknown>,
  submission?: JobFormSubmission | null,
): { textValue: string; imageUrls: string[]; fileLinks: FormPdfFileLink[] } {
  const type = String(field.field_type ?? "").toLowerCase();

  const rawVal =
    (field.api_name ? defaultValues[field.api_name] : undefined) ??
    (field.id != null ? defaultValues[field.id] : undefined);

  const subVal = submission?.values?.find(
    (v) => (field.id != null && v.field_id === field.id) || (field.api_name && v.api_name === field.api_name),
  );
  const subFiles = submission?.files?.filter(
    (f) => (field.id != null && f.field_id === field.id) || (field.api_name && f.api_name === field.api_name),
  );

  const imageUrls: string[] = [];
  const fileLinks: FormPdfFileLink[] = [];

  // 1. Process files from submission.files (authoritative uploaded files)
  if (subFiles && subFiles.length > 0) {
    for (const f of subFiles) {
      if (!f.file_url) continue;
      if (isImageUrl(f.file_url, type)) {
        addUniqueImage(f.file_url, imageUrls);
      } else {
        const name = getFileNameFromUrl(f.file_url, f.field_label || undefined);
        addUniqueFileLink({
          name,
          url: f.file_url,
          kind: isVideoUrl(f.file_url, type) ? "video" : "attachment",
        }, fileLinks);
      }
    }
  }

  // 2. If no files from subFiles, check rawVal (from defaultValues)
  if (imageUrls.length === 0 && fileLinks.length === 0 && rawVal != null) {
    collectFieldFiles(rawVal, type, imageUrls, fileLinks);
  }

  // 3. If still no files, check subVal (from submission.values)
  if (imageUrls.length === 0 && fileLinks.length === 0 && subVal?.value != null) {
    collectFieldFiles(subVal.value, type, imageUrls, fileLinks);
  }

  // Extract non-file text value if not already handled
  let text = "";
  if (imageUrls.length === 0 && fileLinks.length === 0) {
    const candidate = rawVal ?? subVal?.value;
    text = formatNonImageValue(candidate);
  } else {
    // If it has files, check if rawVal was a separate text note
    if (typeof rawVal === "string" && !isDisplayableUrl(rawVal)) {
      text = formatNonImageValue(rawVal);
    }
  }

  return { textValue: text, imageUrls, fileLinks };
}

async function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (!url.startsWith("data:") && !url.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin if failed
      const img2 = new Image();
      img2.onload = () => resolve(img2);
      img2.onerror = () => resolve(null);
      img2.src = url;
    };
    img.src = url;
  });
}

/** Crops drawing/snapshot to pin location with pin marker and labels */
export async function generatePinCropDataUrl(
  imageUrl: string,
  xPercent: number,
  yPercent: number,
  pinColor = "#10b981",
  pinLabel?: string,
  levelName?: string,
): Promise<string | null> {
  try {
    const img = await loadImageElement(imageUrl);
    if (!img) return null;

    const naturalWidth = img.naturalWidth || 800;
    const naturalHeight = img.naturalHeight || 600;

    const smallerDim = Math.min(naturalWidth, naturalHeight);
    const cropFraction = 0.18;
    const cropSize = Math.max(80, Math.round(smallerDim * cropFraction * 2));

    const cx = Math.round((xPercent / 100) * naturalWidth);
    const cy = Math.round((yPercent / 100) * naturalHeight);

    let sx = Math.max(0, Math.min(cx - Math.round(cropSize / 2), naturalWidth - cropSize));
    let sy = Math.max(0, Math.min(cy - Math.round(cropSize / 2), naturalHeight - cropSize));

    const sw = Math.min(cropSize, naturalWidth - sx);
    const sh = Math.min(cropSize, naturalHeight - sy);

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Draw the cropped drawing region
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // Subtle blueprint grid lines
    ctx.strokeStyle = "rgba(100, 116, 139, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Exact position of the pin inside the cropped canvas
    const pinX = ((cx - sx) / sw) * canvas.width;
    const pinY = ((cy - sy) / sh) * canvas.height;

    // 1. Pin drop shadow
    ctx.beginPath();
    ctx.ellipse(pinX, pinY + 11, 7, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fill();

    // 2. Pin downward pointer triangle
    ctx.beginPath();
    ctx.moveTo(pinX, pinY + 10);
    ctx.lineTo(pinX - 4, pinY + 2);
    ctx.lineTo(pinX + 4, pinY + 2);
    ctx.closePath();
    ctx.fillStyle = pinColor;
    ctx.fill();

    // 3. Pin outer white circle
    ctx.beginPath();
    ctx.arc(pinX, pinY, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = pinColor;
    ctx.stroke();

    // 4. Pin colored center dot
    ctx.beginPath();
    ctx.arc(pinX, pinY, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = pinColor;
    ctx.fill();

    // 5. Level badge on top-left
    const displayLevel = levelName && levelName !== "-" ? levelName : "Blueprint";
    ctx.font = "bold 9.5px sans-serif";
    const levelTextW = ctx.measureText(displayLevel).width;
    const levelBadgeW = levelTextW + 16;
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.beginPath();
    ctx.roundRect(6, 6, levelBadgeW, 17, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(226, 232, 240, 0.8)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#334155";
    ctx.fillText(displayLevel, 14, 18);

    // 6. Preview badge on top-right
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.roundRect(canvas.width - 56, 6, 50, 17, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(219, 234, 254, 0.9)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#2563eb";
    ctx.fillText("Preview", canvas.width - 48, 18);

    return canvas.toDataURL("image/jpeg", 0.92);
  } catch (e) {
    console.error("Failed to generate pin crop:", e);
    return null;
  }
}

export async function generateAndDownloadFormPdf(options: GenerateFormPdfOptions): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const fullContentWidth = pageWidth - margin * 2; // 186mm

  // Two-column layout on Page 1 (Main Form on Left, Details Sidebar on Right)
  const sidebarWidth = 60;
  const gap = 6;
  const mainWidthPage1 = fullContentWidth - sidebarWidth - gap; // 120mm
  const sidebarX = margin + mainWidthPage1 + gap; // 138mm

  let isPage1 = true;
  let currentY = margin;

  const hasSidebar = Boolean(options.pinDetails);

  function getContentWidth() {
    return isPage1 && hasSidebar ? mainWidthPage1 : fullContentWidth;
  }

  function checkPageOverflow(neededHeight: number) {
    if (currentY + neededHeight > pageHeight - 14) {
      pdf.addPage();
      isPage1 = false;
      currentY = margin;
      drawPageHeaderMini();
    }
  }

  function drawPageHeaderMini() {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184); // slate-400
    pdf.text(
      `${options.formTitle} — ${options.locationText ? `Location #${options.locationText}` : ""}`,
      margin,
      currentY,
    );
    pdf.setDrawColor(226, 232, 240); // slate-200
    pdf.setLineWidth(0.2);
    pdf.line(margin, currentY + 2, margin + fullContentWidth, currentY + 2);
    currentY += 8;
  }

  // ==========================================
  // 1. Render Details Sidebar on Page 1 (Right)
  // ==========================================
  const details = options.pinDetails;

  if (details) {
    let sY = margin;
    const sX = sidebarX;
    const sW = sidebarWidth;

    let previewImgElem: HTMLImageElement | null = null;
    if (details.previewImageUrl) {
      try {
        previewImgElem = await loadImageElement(details.previewImageUrl);
      } catch {
        // fallback
      }
    }

    const previewH = previewImgElem ? 28 : 16;
    const estimatedSidebarHeight = previewH + 85 + (details.attachments?.length ? details.attachments.length * 6 + 6 : 0);

    // Sidebar Card Background & Border
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.roundedRect(sX, sY, sW, estimatedSidebarHeight, 2, 2, "F");
    pdf.setDrawColor(226, 232, 240); // slate-200
    pdf.setLineWidth(0.3);
    pdf.roundedRect(sX, sY, sW, estimatedSidebarHeight, 2, 2, "S");

    // A. Preview Header inside Sidebar
    if (previewImgElem) {
      pdf.saveGraphicsState?.();
      pdf.addImage(previewImgElem, "JPEG", sX + 0.3, sY + 0.3, sW - 0.6, previewH - 0.6);
      pdf.restoreGraphicsState?.();
      sY += previewH;
    } else {
      pdf.setFillColor(241, 245, 249); // slate-100
      pdf.roundedRect(sX + 0.3, sY + 0.3, sW - 0.6, previewH, 1, 1, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Blueprint: ${details.levelName || "-"}`, sX + 3, sY + 9);
      sY += previewH;
    }

    // Divider under preview
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(sX, sY, sX + sW, sY);
    sY += 3.5;

    // B. Title: Location & Product Name
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42); // slate-900
    pdf.text(`Location #${details.location}`, sX + 3, sY + 2);
    sY += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139); // slate-500
    const prodLines = pdf.splitTextToSize(details.productName || "-", sW - 6);
    pdf.text(prodLines[0] || "-", sX + 3, sY + 1.5);
    sY += 5;

    // Divider
    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.2);
    pdf.line(sX + 3, sY, sX + sW - 3, sY);
    sY += 3.5;

    // C. DETAILS header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(148, 163, 184); // slate-400
    pdf.text("DETAILS", sX + 3, sY + 1);
    sY += 4.5;

    function drawSidebarRow(label: string, value: string, isStatus = false, statusBg = "#10b981", statusFg = "#ffffff") {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text(label, sX + 3, sY + 2);

      if (isStatus) {
        const badgeW = Math.min(22, pdf.getTextWidth(value) + 5);
        const [r, g, b] = hexToRgb(statusBg);
        pdf.setFillColor(r, g, b);
        pdf.roundedRect(sX + sW - 3 - badgeW, sY - 0.5, badgeW, 3.8, 1, 1, "F");

        const [fr, fg, fb] = hexToRgb(statusFg);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.2);
        pdf.setTextColor(fr, fg, fb);
        pdf.text(value, sX + sW - 3 - badgeW / 2, sY + 2.2, { align: "center" });
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(30, 41, 59); // slate-800
        const maxValW = sW - 25;
        const valLines = pdf.splitTextToSize(value || "-", maxValW);
        pdf.text(valLines[0] || "-", sX + sW - 3, sY + 2, { align: "right" });
      }

      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.15);
      pdf.line(sX + 3, sY + 3.8, sX + sW - 3, sY + 3.8);
      sY += 5.2;
    }

    drawSidebarRow("Product Name", details.productName);
    drawSidebarRow("Quantity", String(details.quantity ?? 1));
    drawSidebarRow(
      "Status",
      details.statusName || "Pending",
      true,
      details.statusColor || "#10b981",
      details.statusTextColor || "#ffffff",
    );
    drawSidebarRow("Location", details.location);
    drawSidebarRow("Plot", details.plotName);
    drawSidebarRow("Level", details.levelName);
    drawSidebarRow("Description", details.description || "-");
    drawSidebarRow("Form", details.formName);
    drawSidebarRow("Variation", details.variation);

    // D. Attachments in sidebar if any
    if (details.attachments && details.attachments.length > 0) {
      sY += 1;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.8);
      pdf.setTextColor(148, 163, 184);
      pdf.text("ATTACHMENTS", sX + 3, sY + 1);
      sY += 4;

      for (const att of details.attachments) {
        if (!att.url) continue;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.8);
        pdf.setTextColor(37, 99, 235); // blue-600
        const linkText = `📎 ${att.name.slice(0, 24)}`;
        pdf.textWithLink(linkText, sX + 3, sY + 2, { url: att.url });
        sY += 4.5;
      }
    }
  }

  // ==========================================
  // 2. Render Main Form Area on Left (Page 1)
  // ==========================================
  const formAreaWidth = getContentWidth();

  // Header Banner
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.roundedRect(margin, currentY, formAreaWidth, 22, 2, 2, "F");
  pdf.setDrawColor(226, 232, 240); // slate-200
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, currentY, formAreaWidth, 22, 2, 2, "S");

  // Form Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.text(options.formTitle || "Form Report", margin + 4, currentY + 8);

  // Form ID Tag
  if (options.formId) {
    const titleWidth = pdf.getTextWidth(options.formTitle || "Form Report");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`#${options.formId}`, margin + 4 + titleWidth + 3, currentY + 8);
  }

  // Subtitle / Metadata
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  const subMetaParts: string[] = [];
  if (options.submittedAt) subMetaParts.push(`Submitted: ${options.submittedAt}`);
  if (options.statusName) subMetaParts.push(`Status: ${options.statusName}`);
  if (options.locationText) subMetaParts.push(`Location: #${options.locationText}`);
  if (!hasSidebar && options.productName) subMetaParts.push(options.productName);

  pdf.text(subMetaParts.join("   •   ") || "Form Submission Details", margin + 4, currentY + 16);
  currentY += 27;

  // ==========================================
  // 3. Extract Form Fields Grouped by Section
  // ==========================================
  type FormPdfSectionGroup = {
    sectionIndex: number;
    sectionName: string;
    items: FormPdfFieldItem[];
  };

  const sectionsToRender: FormPdfSectionGroup[] = [];
  let counter = 1;
  const ignoredTypes = new Set(["button", "submit", "reset", "heading", "divider", "separator"]);

  // Build rule visibility state so we can skip fields/sections hidden by form rules
  let fieldRuleState: ReturnType<typeof buildFieldRuleState> | null = null;
  if (options.rules && options.rules.length > 0) {
    // Build a simple fieldToSectionMap from sections
    const fieldToSectionMap: Record<string, string> = {};
    options.sections.forEach((section, sIdx) => {
      const sectionKey = `__section__:${section.id ?? section.sequence ?? sIdx + 1}`;
      for (const field of section.fields ?? []) {
        if (field.id != null) fieldToSectionMap[String(field.id)] = sectionKey;
        if (field.api_name) fieldToSectionMap[field.api_name] = sectionKey;
      }
    });
    fieldRuleState = buildFieldRuleState(
      options.rules,
      options.defaultValues as Record<string, unknown>,
      undefined,
      fieldToSectionMap,
    );
  }

  const isSectionVisible = (section: NormalizedFormSection, sIdx: number): boolean => {
    if (!fieldRuleState) return true;
    const sectionKey = `__section__:${section.id ?? section.sequence ?? sIdx + 1}`;
    const state = fieldRuleState.get(sectionKey);
    return state == null || state.visible !== false;
  };

  const isFieldVisible = (field: NormalizedFormField): boolean => {
    if (!fieldRuleState) return true;
    // Check by field id
    if (field.id != null) {
      const stateById = fieldRuleState.get(String(field.id));
      if (stateById && stateById.visible === false) return false;
    }
    // Check by api_name
    if (field.api_name) {
      const stateByApi = fieldRuleState.get(field.api_name);
      if (stateByApi && stateByApi.visible === false) return false;
    }
    return true;
  };

  options.sections.forEach((section, sIdx) => {
    if (!isSectionVisible(section, sIdx)) return; // skip hidden sections

    const sectionItems: FormPdfFieldItem[] = [];

    for (const field of section.fields ?? []) {
      const typeLower = String(field.field_type ?? "").toLowerCase();
      if (ignoredTypes.has(typeLower)) continue;
      if (!isFieldVisible(field)) continue; // skip hidden fields

      const { textValue, imageUrls, fileLinks } = extractFieldValue(
        field,
        options.defaultValues,
        options.submission,
      );

      const hasContent =
        textValue.trim().length > 0 ||
        imageUrls.length > 0 ||
        fileLinks.length > 0;

      sectionItems.push({
        index: counter++,
        label: field.field_label?.trim() || field.api_name || `Field ${counter}`,
        fieldType: String(field.field_type ?? ""),
        textValue: hasContent ? textValue.trim() : "null",
        imageUrls,
        fileLinks,
      });
    }

    if (sectionItems.length > 0) {
      const rawName =
        (typeof section.name === "string" ? section.name.trim() : "") ||
        (typeof (section as any).sectionHeader === "string" ? (section as any).sectionHeader.trim() : "") ||
        (typeof (section as any).title === "string" ? (section as any).title.trim() : "");
      const sectionName = rawName || `Section ${sIdx + 1}`;
      sectionsToRender.push({
        sectionIndex: sIdx,
        sectionName,
        items: sectionItems,
      });
    }
  });

  // ==========================================
  // 4. Render Form Sections & Fields
  // ==========================================
  const totalItemsCount = sectionsToRender.reduce((sum, s) => sum + s.items.length, 0);

  if (totalItemsCount === 0) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text("No filled fields to display in this form.", margin, currentY);
  } else {
    for (let sIdx = 0; sIdx < sectionsToRender.length; sIdx++) {
      const currentSection = sectionsToRender[sIdx];
      const sectionWidth = getContentWidth();

      // Check overflow for section header banner
      checkPageOverflow(18);

      // Section Header Banner
      pdf.setFillColor(241, 245, 249); // slate-100
      pdf.roundedRect(margin, currentY, sectionWidth, 8, 1.5, 1.5, "F");
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.setLineWidth(0.2);
      pdf.roundedRect(margin, currentY, sectionWidth, 8, 1.5, 1.5, "S");

      // Blue accent pill on left edge
      pdf.setFillColor(37, 99, 235); // blue-600
      pdf.roundedRect(margin, currentY, 3, 8, 1, 1, "F");

      // Section Title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.text(currentSection.sectionName, margin + 6, currentY + 5.5);

      currentY += 12;

      for (const item of currentSection.items) {
      const activeWidth = getContentWidth();
      const hasImages = item.imageUrls && item.imageUrls.length > 0;
      const hasLinks = item.fileLinks && item.fileLinks.length > 0;

      // Estimate needed height
      let estimatedHeight = 12;
      if (hasImages) estimatedHeight += item.imageUrls!.length * 45;
      if (hasLinks) estimatedHeight += item.fileLinks!.length * 7;

      checkPageOverflow(estimatedHeight);

      // Number badge: e.g. "#1"
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(37, 99, 235); // blue-600
      pdf.text(`#${item.index}`, margin + 1, currentY + 4);

      // Label (Bold)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(30, 41, 59); // slate-800
      const labelText = `${item.label}:`;
      const labelWidth = pdf.getTextWidth(labelText);

      // A. If field has Images (Only images are rendered here!)
      if (hasImages) {
        pdf.text(labelText, margin + 12, currentY + 4);
        currentY += 7;

        for (const imgUrl of item.imageUrls!) {
          try {
            const img = await loadImageElement(imgUrl);
            if (img) {
              const maxW = isPage1 ? 75 : 95; // mm
              const maxH = 45; // mm
              const nw = img.naturalWidth || 400;
              const nh = img.naturalHeight || 300;
              const ratio = nw / nh;
              let w = maxW;
              let h = w / ratio;
              if (h > maxH) {
                h = maxH;
                w = h * ratio;
              }

              checkPageOverflow(h + 5);

              // Border container
              pdf.setFillColor(248, 250, 252);
              pdf.roundedRect(margin + 12, currentY, w + 2, h + 2, 1, 1, "F");
              pdf.setDrawColor(226, 232, 240);
              pdf.roundedRect(margin + 12, currentY, w + 2, h + 2, 1, 1, "S");

              const isPng =
                imgUrl.startsWith("data:image/png") ||
                imgUrl.toLowerCase().includes(".png");
              pdf.addImage(img, isPng ? "PNG" : "JPEG", margin + 13, currentY + 1, w, h);
              currentY += h + 5;
            } else {
              pdf.setFont("helvetica", "italic");
              pdf.setFontSize(8.5);
              pdf.setTextColor(148, 163, 184);
              pdf.text("[Image attachment]", margin + 12, currentY + 4);
              currentY += 7;
            }
          } catch {
            pdf.setFont("helvetica", "italic");
            pdf.setFontSize(8.5);
            pdf.setTextColor(148, 163, 184);
            pdf.text("[Image attachment]", margin + 12, currentY + 4);
            currentY += 7;
          }
        }
      }

      // B. If field has Video / Document / Attachment File Links (Clickable Hyperlinks!)
      if (hasLinks) {
        if (!hasImages) {
          pdf.text(labelText, margin + 12, currentY + 4);
          currentY += 6;
        }

        for (const link of item.fileLinks!) {
          checkPageOverflow(8);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(37, 99, 235); // blue-600

          const prefix = link.kind === "video" ? "▶ Video" : "📎 File";
          const maxNameLen = isPage1 ? 36 : 55;
          const cleanName =
            link.name.length > maxNameLen
              ? `${link.name.slice(0, maxNameLen)}...`
              : link.name;
          const displayLinkText = `${prefix}: ${cleanName} (Click to open)`;

          const linkX = margin + 14;
          pdf.textWithLink(displayLinkText, linkX, currentY + 3, { url: link.url });

          const linkWidth = pdf.getTextWidth(displayLinkText);
          pdf.setDrawColor(37, 99, 235);
          pdf.setLineWidth(0.2);
          pdf.line(linkX, currentY + 3.8, linkX + linkWidth, currentY + 3.8);

          try {
            pdf.link(linkX, currentY, linkWidth, 4.5, { url: link.url });
          } catch {
            // textWithLink already applied
          }

          currentY += 6.5;
        }
      }

      // C. If field has regular text value (or "null")
      if (item.textValue && !hasImages && !hasLinks) {
        const textVal = item.textValue;
        const isNullVal = textVal.toLowerCase() === "null";
        const availableTextWidth = activeWidth - (12 + labelWidth + 4);
        const singleLineValWidth = pdf.getTextWidth(textVal);

        if (labelWidth < 50 && singleLineValWidth <= availableTextWidth) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9.5);
          pdf.setTextColor(30, 41, 59);
          pdf.text(labelText, margin + 12, currentY + 4);

          pdf.setFont("helvetica", isNullVal ? "italic" : "normal");
          pdf.setFontSize(9);
          if (isNullVal) {
            pdf.setTextColor(148, 163, 184); // slate-400 for null
          } else {
            pdf.setTextColor(51, 65, 85); // slate-700
          }
          pdf.text(textVal, margin + 12 + labelWidth + 3, currentY + 4);
          currentY += 7.5;
        } else {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9.5);
          pdf.setTextColor(30, 41, 59);
          const labelLines = pdf.splitTextToSize(labelText, activeWidth - 14);
          pdf.text(labelLines, margin + 12, currentY + 4);
          currentY += labelLines.length * 4.2 + 2;

          pdf.setFont("helvetica", isNullVal ? "italic" : "normal");
          pdf.setFontSize(9);
          if (isNullVal) {
            pdf.setTextColor(148, 163, 184);
          } else {
            pdf.setTextColor(51, 65, 85);
          }
          const valLines = pdf.splitTextToSize(textVal, activeWidth - 16);
          pdf.text(valLines, margin + 15, currentY + 3);
          currentY += valLines.length * 4.2 + 2.5;
        }
      }

      // Divider line between fields
      pdf.setDrawColor(241, 245, 249); // slate-100
      pdf.setLineWidth(0.2);
      pdf.line(margin + 12, currentY, margin + activeWidth, currentY);
      currentY += 3;
    }

    // Spacing between sections
    currentY += 4;
  }
}

  // ==========================================
  // 5. Page Numbers & Footer on All Pages
  // ==========================================
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `Generated on ${new Date().toLocaleDateString()} — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" },
    );
  }

  // ==========================================
  // 6. Save & Download
  // ==========================================
  const safeName = (options.formTitle || "Form")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
  const locSuffix = options.locationText ? `_Loc-${options.locationText}` : "";
  pdf.save(`${safeName}${locSuffix}_Report.pdf`);
}
