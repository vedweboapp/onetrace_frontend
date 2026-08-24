"use client";

import * as React from "react";
import type { ReactNode } from "react";
import {
  detailRecordInnerClassName,
  detailRecordSurfaceShellClassName,
} from "@/shared/components/layout/detail-metric-card";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import {
  entityDetailPageClassName,
  entityDetailSurfaceClassName,
  entityDetailSurfaceInnerClassName,
  entityDetailTabPanelClassName,
} from "@/shared/components/layout/detail-tab-layout";
import { EntityDetailErrorState } from "@/shared/components/entity/entity-detail-error";
import { EntityDetailNotFoundState } from "@/shared/components/entity/entity-detail-not-found";
import { EntityDetailLoadingSkeleton } from "@/shared/components/entity/entity-detail-loading";
import { useEntityDetailBack } from "@/shared/hooks/use-entity-detail-back";
import { useEntityDetailScreen } from "@/shared/hooks/use-entity-detail-screen";
import type { DashboardListSection } from "@/shared/utils/detail-from-list.util";
import { SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

export type EntityDetailScreenLabels = {
  metaTitle: string;
  backAria: string;
  retry: string;
};

export type EntityDetailScreenContext<T> = {
  detail: T | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  retry: () => void;
  dateFmt: Intl.DateTimeFormat;
  listBack: string;
};

export type EntityDetailScreenProps<T> = {
  entityId: number;
  listSection: DashboardListSection;
  listRoute: string;
  labels: EntityDetailScreenLabels;
  loadError: string;
  fetch: (id: number) => Promise<T>;
  getTitle: (detail: T) => string;
  subtitle?: (detail: T) => ReactNode;
  actions?: (ctx: { detail: T; listBack: string; retry: () => void }) => ReactNode;
  headerExtension?: ReactNode;
  children?: (ctx: { detail: T; dateFmt: Intl.DateTimeFormat; retry: () => void }) => ReactNode;
  renderSurface?: (ctx: EntityDetailScreenContext<T>) => ReactNode;
  onDetailChange?: (detail: T | null) => void;
  footer?: ReactNode;
  className?: string;
  /** When false, skip the white SurfaceShell wrapper (e.g. full scheduling calendar). */
  wrapSurface?: boolean;
};

/**
 * Shared entity detail chrome.
 * Scroll model: natural content height → only the dashboard main pane scrolls.
 * List tabs that need a tall empty state use `DetailTabListShell` / `detailTabFillViewportClassName`.
 * Full-bleed tabs (scheduling) pass `wrapSurface={false}` + a fill `className`.
 */
export function EntityDetailScreen<T>({
  entityId,
  listSection,
  listRoute,
  labels,
  loadError,
  fetch,
  getTitle,
  subtitle,
  actions,
  children,
  renderSurface,
  headerExtension,
  onDetailChange,
  footer,
  className,
  wrapSurface = true,
}: EntityDetailScreenProps<T>) {
  const listBack = useEntityDetailBack(listSection, listRoute);
  const { detail, loading, error, notFound, retry, dateFmt } = useEntityDetailScreen({
    entityId,
    fetch,
    loadError,
  });

  React.useEffect(() => {
    onDetailChange?.(detail);
  }, [detail, onDetailChange]);

  const title = detail ? getTitle(detail) : labels.metaTitle;
  const titleLoading = loading && !detail;
  const screenCtx: EntityDetailScreenContext<T> = {
    detail,
    loading,
    error,
    notFound,
    retry,
    dateFmt,
    listBack,
  };
  const notFoundSurface = <EntityDetailNotFoundState backHref={listBack} fill />;
  const defaultSurface =
    loading ? (
      <EntityDetailLoadingSkeleton />
    ) : notFound ? (
      notFoundSurface
    ) : error ? (
      <EntityDetailErrorState message={error} retryLabel={labels.retry} onRetry={retry} />
    ) : detail && children ? (
      children({ detail, dateFmt, retry })
    ) : null;

  const surfaceBody = notFound
    ? notFoundSurface
    : renderSurface
      ? (
          <div className={entityDetailTabPanelClassName}>{renderSurface(screenCtx)}</div>
        )
      : defaultSurface;

  return (
    <div className={cn(entityDetailPageClassName, "pb-8 sm:pb-10", className)}>
      <DetailPageHeader
        title={title}
        titleLoading={titleLoading}
        backHref={listBack}
        backAriaLabel={labels.backAria}
        subtitle={detail && subtitle ? subtitle(detail) : undefined}
        extension={headerExtension}
        actions={!loading && !error && !notFound && detail && actions ? actions({ detail, listBack, retry }) : null}
      />

      {wrapSurface ? (
        <SurfaceShell className={cn(detailRecordSurfaceShellClassName, entityDetailSurfaceClassName)}>
          <div className={cn(detailRecordInnerClassName, entityDetailSurfaceInnerClassName)}>
            {surfaceBody}
          </div>
        </SurfaceShell>
      ) : (
        surfaceBody
      )}

      {footer}
    </div>
  );
}
