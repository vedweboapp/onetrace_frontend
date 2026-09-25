/** Shared HTML pin glyph for jobs map markers (pointer cursor on hover). */

/** Fixed map pin colour — status pastels read as invisible on light map tiles. */
export const JOB_MAP_PIN_COLOR = "#dc2626";

function darkenHex(hex: string, amount = 0.18): string {
  const value = hex.trim();
  const normalized = /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : /^#[0-9a-fA-F]{3}$/.test(value)
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : JOB_MAP_PIN_COLOR;
  const n = normalized.slice(1);
  const num = Number.parseInt(n, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function createJobMapPinElement(options: {
  title: string;
  /** Ignored — pins use a fixed red so they stay visible on the map. */
  color?: string | null;
  selected?: boolean;
}): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "ot-job-map-pin";
  el.title = options.title;
  el.setAttribute("aria-label", options.title);

  const fill = JOB_MAP_PIN_COLOR;
  el.dataset.pinColor = fill;
  if (options.selected) el.dataset.selected = "true";

  el.style.cssText = [
    "all:unset",
    "box-sizing:border-box",
    "display:inline-flex",
    "align-items:flex-end",
    "justify-content:center",
    "width:30px",
    "height:38px",
    "cursor:pointer",
    "transform-origin:bottom center",
    "transition:transform 120ms ease",
    "filter:drop-shadow(0 2px 3px rgba(15,23,42,.35))",
  ].join(";");

  const stroke = darkenHex(fill, 0.22);

  el.innerHTML = `
    <svg width="30" height="38" viewBox="0 0 28 36" aria-hidden="true" focusable="false">
      <path
        d="M14 1.25c-6.07 0-11 4.82-11 10.76 0 8.08 9.47 19.34 10.32 20.32a0.95 0.95 0 0 0 1.36 0C15.53 31.35 25 20.09 25 12.01 25 6.07 20.07 1.25 14 1.25z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="1.1"
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
  const base = JOB_MAP_PIN_COLOR;
  if (path) {
    const fill = selected ? darkenHex(base, 0.12) : base;
    path.setAttribute("fill", fill);
    path.setAttribute("stroke", darkenHex(fill, 0.22));
  }
  if (selected) {
    el.dataset.selected = "true";
    el.style.transform = "scale(1.08)";
  } else {
    delete el.dataset.selected;
    el.style.transform = "scale(1)";
  }
}
