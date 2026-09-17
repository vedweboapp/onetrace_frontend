"use client";

import * as React from "react";
import { cn } from "@/core/utils/http.util";

type Props = {
  children: React.ReactNode;
  /** Tailwind line-clamp class, e.g. line-clamp-2 / line-clamp-3 */
  clampClassName?: string;
  className?: string;
  expandLabel?: string;
  collapseLabel?: string;
};

/**
 * Clamps long text to a max height (line-clamp). When content overflows,
 * shows a control to expand / collapse so the layout stays inside its column.
 */
export function ExpandableClampText({
  children,
  clampClassName = "line-clamp-3",
  className,
  expandLabel = "Show more",
  collapseLabel = "Show less",
}: Props) {
  const textRef = React.useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [overflows, setOverflows] = React.useState(false);

  const measure = React.useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    // When expanded, temporarily clamp to detect whether overflow exists.
    if (expanded) {
      el.classList.add(clampClassName);
      const needed = el.scrollHeight > el.clientHeight + 1;
      el.classList.remove(clampClassName);
      setOverflows(needed);
      return;
    }
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [clampClassName, expanded]);

  React.useLayoutEffect(() => {
    measure();
  }, [measure, children]);

  React.useEffect(() => {
    const el = textRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  React.useEffect(() => {
    setExpanded(false);
  }, [children]);

  return (
    <div className={cn("min-w-0 max-w-full", className)}>
      <div
        ref={textRef}
        className={cn(
          "min-w-0 max-w-full break-words [overflow-wrap:anywhere]",
          !expanded && clampClassName,
        )}
      >
        {children}
      </div>
      {overflows ? (
        <button
          type="button"
          className="mt-1 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-400"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
      ) : null}
    </div>
  );
}
