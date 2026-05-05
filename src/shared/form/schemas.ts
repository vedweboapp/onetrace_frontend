import { z } from "zod";

/** Trims and requires at least one visible character. */
export function zTrimmedNonEmpty(message = "required") {
  return z.string().trim().min(1, message);
}

/** Leading `#`, expands `#rgb` shorthand, clamps length — then validates 6-digit hex. */
export function zHexColour6(message = "invalidHex") {
  return z
    .string()
    .trim()
    .transform((raw) => {
      const t = raw.trim();
      if (!t) return "";
      const h = t.startsWith("#") ? t : `#${t}`;
      if (h.length === 4 && /^#[0-9a-fA-F]{3}$/i.test(h)) {
        return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
      }
      return h.slice(0, 7).toLowerCase();
    })
    .refine((s) => /^#[0-9a-fA-F]{6}$/.test(s), { message });
}
