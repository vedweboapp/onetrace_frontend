const colorFillCache = new Map<string, string>();
const imageElementCache = new Map<string, HTMLImageElement>();
const MAX_CACHE_ENTRIES = 120;

function getCacheKey(imageSrc: string, color: string): string {
  const len = imageSrc.length;
  const head = imageSrc.slice(0, 48);
  const tail = imageSrc.slice(-32);
  return `${len}:${head}:${tail}::${color}`;
}

/**
 * Preloads and decodes an image into GPU/browser cache so subsequent renders are instantaneous.
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  if (!src) return Promise.reject(new Error("No image src"));
  if (imageElementCache.has(src)) {
    const existing = imageElementCache.get(src)!;
    if (existing.complete && existing.naturalWidth > 0) {
      return Promise.resolve(existing);
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = async () => {
      imageElementCache.set(src, img);
      if ("decode" in img) {
        try {
          await img.decode();
        } catch {
          // ignore decode errors on unsupported formats
        }
      }
      resolve(img);
    };
    img.onerror = () => {
      resolve(img);
    };
    img.src = src;
  });
}

/**
 * SVG path/stroke replacement or canvas source-atop raster tinting for kiosk color options.
 * Clamped to 480px max dimension and cached to prevent GPU VRAM exhaustion.
 */
export async function applyColorFill(
  imageSrc: string,
  color: string,
): Promise<string> {
  if (!imageSrc || !color) return imageSrc;

  const cacheKey = getCacheKey(imageSrc, color);
  if (colorFillCache.has(cacheKey)) {
    return colorFillCache.get(cacheKey)!;
  }

  const isSvg =
    imageSrc.startsWith("data:image/svg+xml") ||
    imageSrc.endsWith(".svg") ||
    imageSrc.includes("<svg");

  if (isSvg) {
    try {
      let svgText = "";
      if (imageSrc.startsWith("data:image/svg+xml;base64,")) {
        svgText = atob(imageSrc.replace("data:image/svg+xml;base64,", ""));
      } else if (imageSrc.startsWith("data:image/svg+xml;utf8,")) {
        svgText = decodeURIComponent(
          imageSrc.replace("data:image/svg+xml;utf8,", ""),
        );
      } else if (imageSrc.includes("<svg")) {
        svgText = imageSrc;
      } else if (!imageSrc.startsWith("data:")) {
        const res = await fetch(imageSrc);
        if (res.ok) svgText = await res.text();
      }

      if (svgText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (svg) {
          const shapes = svg.querySelectorAll(
            "path, circle, rect, polygon, ellipse, line, polyline",
          );
          if (shapes.length > 0) {
            shapes.forEach((s) => {
              const currentFill = s.getAttribute("fill");
              if (currentFill !== "none") {
                s.setAttribute("fill", color);
              }
              const currentStroke = s.getAttribute("stroke");
              if (currentStroke && currentStroke !== "none") {
                s.setAttribute("stroke-width", s.getAttribute("stroke-width") || "2");
              } else {
                s.setAttribute("stroke", "rgba(15, 23, 42, 0.6)");
                s.setAttribute("stroke-width", "1.5");
                s.setAttribute("paint-order", "stroke fill");
              }
            });
          } else {
            svg.setAttribute("fill", color);
            svg.setAttribute("stroke", "rgba(15, 23, 42, 0.6)");
            svg.setAttribute("stroke-width", "1.5");
          }
          const serializer = new XMLSerializer();
          const serialized = serializer.serializeToString(doc);
          const result = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(serialized)))}`;
          if (colorFillCache.size >= MAX_CACHE_ENTRIES) {
            const oldestKey = colorFillCache.keys().next().value;
            if (oldestKey) colorFillCache.delete(oldestKey);
          }
          colorFillCache.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // fallback to raster canvas tinting
    }
  }

  try {
    const img = await preloadImage(imageSrc);
    const rawW = img.naturalWidth || img.width || 300;
    const rawH = img.naturalHeight || img.height || 200;

    // Cap dimensions at 480px to avoid allocating massive GPU framebuffers
    const MAX_DIM = 480;
    let w = rawW;
    let h = rawH;
    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) {
        h = Math.max(1, Math.round((h * MAX_DIM) / w));
        w = MAX_DIM;
      } else {
        h = Math.max(1, Math.round((w * MAX_DIM) / h));
        h = MAX_DIM;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return imageSrc;
    }

    // 1. Draw base image scaled down
    ctx.drawImage(img, 0, 0, w, h);

    // 2. Padding inset for the color fill
    const pad = Math.max(3, Math.round(Math.min(w, h) * 0.05));

    // 3. Offscreen canvas for the inset color fill
    const offCanvas = document.createElement("canvas");
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext("2d");
    if (offCtx) {
      offCtx.drawImage(img, pad, pad, w - pad * 2, h - pad * 2);
      offCtx.globalCompositeOperation = "source-atop";
      offCtx.fillStyle = color;
      offCtx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(offCanvas, 0, 0);

      ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    }

    const result = canvas.toDataURL("image/png");

    // Immediately deallocate GPU memory backing the canvas elements
    canvas.width = 0;
    canvas.height = 0;
    offCanvas.width = 0;
    offCanvas.height = 0;

    if (colorFillCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = colorFillCache.keys().next().value;
      if (oldestKey) colorFillCache.delete(oldestKey);
    }
    colorFillCache.set(cacheKey, result);

    return result;
  } catch {
    return imageSrc;
  }
}
