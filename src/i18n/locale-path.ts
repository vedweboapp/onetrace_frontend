import { routing } from "./routing";

/**
 * Ensures a pathname has no leading `/{locale}` segments (handles double-prefix bugs).
 * next-intl `usePathname()` is usually unprefixed; `next/navigation` pathname is not — strip defensively.
 */
export function stripLocaleSegmentsFromPathname(pathname: string): string {
  let p = pathname;
  let changed = true;
  while (changed) {
    changed = false;
    for (const loc of routing.locales) {
      const pre = `/${loc}`;
      if (p === pre || p.startsWith(`${pre}/`)) {
        p = p.slice(pre.length) || "/";
        changed = true;
        break;
      }
    }
  }
  return p;
}
