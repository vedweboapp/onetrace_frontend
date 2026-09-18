/** Shared HTML pin glyph for jobs map markers (pointer cursor on hover). */

const DEFAULT_PIN_COLOR = "#e11d48";

function normalizeHexColor(raw: string | null | undefined, fallback: string): string {
  const value = raw?.trim() ?? "";
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1]!;
    const g = value[2]!;
    const b = value[3]!;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function darkenHex(hex: string, amount = 0.18): string {
  const n = normalizeHexColor(hex, DEFAULT_PIN_COLOR).slice(1);
  const num = Number.parseInt(n, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function createJobMapPinElement(options: {
  title: string;
  /** Job status bg colour (hex). */
  color?: string | null;
  selected?: boolean;
}): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "ot-job-map-pin";
  el.title = options.title;
  el.setAttribute("aria-label", options.title);

  const fill = normalizeHexColor(options.color, DEFAULT_PIN_COLOR);
  el.dataset.pinColor = fill;
  if (options.selected) el.dataset.selected = "true";

  // Soft shadow only — heavy drop-shadow + dark stroke looked like a black border when pins overlapped.
  el.style.cssText = [
    "all:unset",
    "box-sizing:border-box",
    "display:inline-flex",
    "align-items:flex-end",
    "justify-content:center",
    "width:28px",
    "height:36px",
    "cursor:pointer",
    "transform-origin:bottom center",
    "transition:transform 120ms ease",
    "filter:drop-shadow(0 1px 2px rgba(15,23,42,.22))",
  ].join(";");

  const stroke = darkenHex(fill, 0.12);

  el.innerHTML = `
    <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true" focusable="false">
      <path
        d="M14 1.25c-6.07 0-11 4.82-11 10.76 0 8.08 9.47 19.34 10.32 20.32a0.95 0.95 0 0 0 1.36 0C15.53 31.35 25 20.09 25 12.01 25 6.07 20.07 1.25 14 1.25z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="0.75"
      />
      <circle cx="14" cy="12" r="4.25" fill="#fff"/>
    </svg>
  `;

  el.addEventListener("mouseenter", () => {
    el.style.transform = "scale(1.1)";
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = el.dataset.selected === "true" ? "scale(1.08)" : "scale(1)";
  });
  if (options.selected) el.style.transform = "scale(1.08)";

  return el;
}

export function setJobMapPinSelected(el: HTMLElement | null | undefined, selected: boolean) {
  if (!el) return;
  const path = el.querySelector("path");
  const base = normalizeHexColor(el.dataset.pinColor, DEFAULT_PIN_COLOR);
  if (path) {
    const fill = selected ? darkenHex(base, 0.08) : base;
    path.setAttribute("fill", fill);
    path.setAttribute("stroke", darkenHex(fill, 0.12));
  }
  if (selected) {
    el.dataset.selected = "true";
    el.style.transform = "scale(1.08)";
  } else {
    delete el.dataset.selected;
    el.style.transform = "scale(1)";
  }
}
