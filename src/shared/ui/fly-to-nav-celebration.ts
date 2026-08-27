/**
 * Lightweight celebration: a small card flies to a nav target (sidebar / top nav)
 * with a soft chime. Uses Web Animations API — no extra deps.
 */

export type FlyToNavCelebrationOptions = {
  /** CSS selector for destination, e.g. `[data-nav="dispatches"]` */
  targetSelector: string;
  /** Optional start element (confirm button). Falls back to viewport center. */
  fromEl?: HTMLElement | null;
  label: string;
  /** Total flight duration in ms (default ~780 — snappy, not frantic). */
  durationMs?: number;
  /** Play a soft UI chime (default true). */
  sound?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Soft two-tone chime via Web Audio (no asset file). */
function playSoftDispatchChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, dur: number, gainPeak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    };

    // Short ascending “sent” blip
    playTone(520, now, 0.12, 0.045);
    playTone(780, now + 0.08, 0.16, 0.035);

    window.setTimeout(() => {
      void ctx.close();
    }, 500);
  } catch {
    /* ignore — sound is optional */
  }
}

function resolveTargetRect(selector: string): DOMRect | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (nodes.length === 0) return null;

  // Prefer a visible target (Hydrogen top nav vs Lithium sidebar).
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < window.innerHeight) {
      return r;
    }
  }
  return nodes[0]?.getBoundingClientRect() ?? null;
}

/**
 * Animates a floating card from `fromEl` (or screen center) to the nav target.
 * Resolves when the animation finishes (or immediately if reduced motion / no target).
 */
export function playFlyToNavCelebration(options: FlyToNavCelebrationOptions): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const { targetSelector, fromEl, label, durationMs = 780, sound = true } = options;

  if (sound && !prefersReducedMotion()) {
    playSoftDispatchChime();
  }

  const targetRect = resolveTargetRect(targetSelector);
  if (!targetRect || prefersReducedMotion()) {
    return Promise.resolve();
  }

  const fromRect = fromEl?.getBoundingClientRect();
  const startX = fromRect
    ? fromRect.left + fromRect.width / 2
    : window.innerWidth / 2;
  const startY = fromRect
    ? fromRect.top + fromRect.height / 2
    : window.innerHeight * 0.42;

  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;

  const card = document.createElement("div");
  card.setAttribute("aria-hidden", "true");
  card.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "z-index:9999",
    "pointer-events:none",
    "display:flex",
    "align-items:center",
    "gap:8px",
    "padding:10px 14px",
    "border-radius:12px",
    "background:color-mix(in srgb, var(--dash-accent,#111111) 92%, #0f172a)",
    "color:#fff",
    "box-shadow:0 12px 28px rgba(15,23,42,0.28)",
    "font-size:13px",
    "font-weight:600",
    "letter-spacing:0.01em",
    "white-space:nowrap",
    "will-change:transform,opacity",
  ].join(";");

  const icon = document.createElement("span");
  icon.style.cssText =
    "display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;flex-shrink:0";
  icon.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

  const text = document.createElement("span");
  text.textContent = label;

  card.appendChild(icon);
  card.appendChild(text);
  document.body.appendChild(card);

  // Measure after mount for centering
  const cardW = card.offsetWidth || 140;
  const cardH = card.offsetHeight || 40;
  const midX = (startX + endX) / 2;
  const midY = Math.min(startY, endY) - Math.min(72, Math.abs(endY - startY) * 0.35 + 36);

  const dx0 = startX - cardW / 2;
  const dy0 = startY - cardH / 2;
  const dx1 = midX - cardW / 2;
  const dy1 = midY - cardH / 2;
  const dx2 = endX - cardW / 2;
  const dy2 = endY - cardH / 2;

  return new Promise((resolve) => {
    const anim = card.animate(
      [
        {
          transform: `translate(${dx0}px, ${dy0}px) scale(0.86)`,
          opacity: 0,
          offset: 0,
        },
        {
          transform: `translate(${dx0}px, ${dy0}px) scale(1)`,
          opacity: 1,
          offset: 0.12,
        },
        {
          transform: `translate(${dx1}px, ${dy1}px) scale(0.96)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(${dx2}px, ${dy2}px) scale(0.35)`,
          opacity: 0.15,
          offset: 1,
        },
      ],
      {
        duration: durationMs,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );

    const finish = () => {
      card.remove();
      // Brief pulse on the nav target
      const targets = document.querySelectorAll<HTMLElement>(targetSelector);
      for (const el of targets) {
        const r = el.getBoundingClientRect();
        if (r.width < 2) continue;
        el.animate(
          [
            { transform: "scale(1)", offset: 0 },
            { transform: "scale(1.06)", offset: 0.4 },
            { transform: "scale(1)", offset: 1 },
          ],
          { duration: 280, easing: "ease-out" },
        );
      }
      resolve();
    };

    anim.onfinish = finish;
    anim.oncancel = finish;
  });
}
