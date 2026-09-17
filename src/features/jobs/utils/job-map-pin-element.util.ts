/** Shared HTML pin glyph for jobs map markers (pointer cursor on hover). */

export function createJobMapPinElement(options: {
  title: string;
  selected?: boolean;
}): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "ot-job-map-pin";
  el.title = options.title;
  el.setAttribute("aria-label", options.title);
  if (options.selected) el.dataset.selected = "true";

  el.style.cssText = [
    "all:unset",
    "box-sizing:border-box",
    "display:inline-flex",
    "align-items:flex-end",
    "justify-content:center",
    "width:36px",
    "height:44px",
    "cursor:pointer",
    "transform-origin:bottom center",
    "transition:transform 120ms ease",
    "filter:drop-shadow(0 2px 4px rgba(15,23,42,.28))",
  ].join(";");

  const fill = options.selected ? "#0f766e" : "#e11d48";
  const stroke = options.selected ? "#115e59" : "#9f1239";

  el.innerHTML = `
    <svg width="32" height="40" viewBox="0 0 32 40" aria-hidden="true" focusable="false">
      <path
        d="M16 1.5c-7.18 0-13 5.7-13 12.74 0 9.56 11.2 22.86 12.2 24.02a1.1 1.1 0 0 0 1.6 0C17.8 37.1 29 23.8 29 14.24 29 7.2 23.18 1.5 16 1.5z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="1.25"
      />
      <circle cx="16" cy="14" r="5.25" fill="#fff" opacity=".95"/>
    </svg>
  `;

  el.addEventListener("mouseenter", () => {
    el.style.transform = "scale(1.08)";
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = options.selected ? "scale(1.06)" : "scale(1)";
  });
  if (options.selected) el.style.transform = "scale(1.06)";

  return el;
}

export function setJobMapPinSelected(el: HTMLElement | null | undefined, selected: boolean) {
  if (!el) return;
  const path = el.querySelector("path");
  if (path) {
    path.setAttribute("fill", selected ? "#0f766e" : "#e11d48");
    path.setAttribute("stroke", selected ? "#115e59" : "#9f1239");
  }
  if (selected) {
    el.dataset.selected = "true";
    el.style.transform = "scale(1.06)";
  } else {
    delete el.dataset.selected;
    el.style.transform = "scale(1)";
  }
}
