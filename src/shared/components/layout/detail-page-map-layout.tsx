import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { DetailPanelCard, detailPageStackClassName } from "@/shared/components/layout/detail-metric-card";

/** Fixed map viewport — side column only; main column height stays natural. */
export const detailMapViewportClassName = "h-[280px] sm:h-[320px] lg:h-[360px]";

export const detailMapFillClassName = cn(
  "flex h-full w-full flex-col",
  "rounded-none border-0 shadow-none",
);

export const detailMapSideGridClassName = cn(
  "grid grid-cols-1 gap-4",
  "lg:grid-cols-[minmax(0,1fr)_minmax(320px,40%)] lg:items-start lg:gap-5",
  "xl:grid-cols-[minmax(0,1fr)_minmax(380px,42%)]",
);

type DetailMapSideColumnProps = {
  title?: ReactNode;
  map: ReactNode;
  className?: string;
};

/** Dedicated right column: white card with map at a fixed height. */
export function DetailMapSideColumn({ title, map, className }: DetailMapSideColumnProps) {
  return (
    <aside className={cn("min-w-0 lg:sticky lg:top-4 lg:self-start", className)}>
      <DetailPanelCard title={title} bodyClassName="p-0">
        <div className={cn(detailMapViewportClassName, "w-full overflow-hidden")}>{map}</div>
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
  className?: string;
};

/**
 * Two-column detail layout: main cards on the left, full map column on the right (lg+).
 * On small screens the map column is shown first (top), still fixed height.
 */
export function DetailPageMapLayout({
  map,
  mapTitle,
  showMap = true,
  children,
  className,
}: DetailPageMapLayoutProps) {
  if (!showMap) {
    return <div className={cn(detailPageStackClassName, className)}>{children}</div>;
  }

  return (
    <div className={cn(detailMapSideGridClassName, className)}>
      <div className={cn("order-2 min-w-0 lg:order-1", detailPageStackClassName)}>{children}</div>
      <DetailMapSideColumn title={mapTitle} map={map ?? null} className="order-1 lg:order-2" />
    </div>
  );
}
