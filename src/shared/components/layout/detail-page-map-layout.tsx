import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { DetailPanelCard, detailPageStackClassName } from "@/shared/components/layout/detail-metric-card";

/** Fixed map viewport — side column only; main column height stays natural. */
export const detailMapViewportClassName = "h-[280px] sm:h-[320px] lg:h-[360px]";

/** Stretches with the adjacent form/content column on lg+ (quotation/site forms). */
export const detailMapFormViewportClassName = "h-full min-h-[280px] sm:min-h-[320px]";

export const detailMapFillClassName = cn(
  "flex h-full w-full flex-col",
  "rounded-none border-0 shadow-none",
);

export const detailMapSideGridClassName = cn(
  "grid grid-cols-1 gap-3",
  "lg:grid-cols-[minmax(0,1fr)_minmax(320px,40%)] lg:items-start lg:gap-4",
  "xl:grid-cols-[minmax(0,1fr)_minmax(380px,42%)]",
);

/** Detail + form layouts where the map column should match the main column height. */
export const detailMapStretchSideGridClassName = cn(
  "grid grid-cols-1 gap-3",
  "lg:grid-cols-[minmax(0,1fr)_minmax(320px,40%)] lg:items-stretch lg:gap-4",
  "xl:grid-cols-[minmax(0,1fr)_minmax(380px,42%)]",
);

type DetailMapSideColumnProps = {
  title?: ReactNode;
  map: ReactNode;
  className?: string;
  fillHeight?: boolean;
};

/** Dedicated right column: white card with map at a fixed height. */
export function DetailMapSideColumn({ title, map, className, fillHeight }: DetailMapSideColumnProps) {
  return (
    <aside
      className={cn(
        "min-w-0",
        fillHeight ? "flex h-full min-h-0 flex-col lg:self-stretch" : "lg:sticky lg:top-4 lg:self-start",
        className,
      )}
    >
      <DetailPanelCard
        title={title}
        className={cn(fillHeight && "flex h-full min-h-0 flex-1 flex-col")}
        bodyClassName={cn("p-0", fillHeight && "flex min-h-0 flex-1 flex-col")}
      >
        <div
          className={cn(
            "w-full overflow-hidden",
            fillHeight ? detailMapFormViewportClassName : detailMapViewportClassName,
          )}
        >
          {map}
        </div>
      </DetailPanelCard>
    </aside>
  );
}

type DetailPageMapLayoutProps = {
  /** Map node (e.g. AddressMiniMap). Omit or set showMap false to hide the side column. */
  map?: ReactNode | null;
  mapTitle?: ReactNode;
  showMap?: boolean;
  children: ReactNode;
  /** Rendered below the main row; spans full width on lg+ (e.g. long site contact list). */
  footer?: ReactNode;
  className?: string;
  /** Override the default lg two-column template (e.g. equal halves for forms). */
  gridClassName?: string;
  /** Map column grows to match the main column height on lg+ (forms / quotation detail). */
  mapFillHeight?: boolean;
};

/**
 * Two-column detail layout: main cards on the left, full map column on the right (lg+).
 * On small screens the map column is shown first (top), still fixed height.
 */
export const detailMapFormGridClassName = cn(
  "grid grid-cols-1 gap-4",
  "lg:grid-cols-2 lg:items-stretch lg:gap-6",
);

export function DetailPageMapLayout({
  map,
  mapTitle,
  showMap = true,
  children,
  footer,
  className,
  gridClassName,
  mapFillHeight = false,
}: DetailPageMapLayoutProps) {
  if (!showMap) {
    return (
      <div className={cn(detailPageStackClassName, className)}>
        {children}
        {footer}
      </div>
    );
  }

  const grid =
    gridClassName ??
    (mapFillHeight ? detailMapStretchSideGridClassName : detailMapSideGridClassName);

  return (
    <div className={cn(grid, className)}>
      <div className={cn("order-2 min-w-0 lg:order-1", detailPageStackClassName)}>{children}</div>
      <DetailMapSideColumn
        title={mapTitle}
        map={map ?? null}
        className="order-1 lg:order-2"
        fillHeight={mapFillHeight}
      />
      {footer ? (
        <div className="order-3 min-w-0 border-t border-slate-200/90 pt-4 dark:border-slate-800 lg:col-span-2">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
