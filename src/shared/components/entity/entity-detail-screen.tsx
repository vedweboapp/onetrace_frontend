"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { detailRecordSurfaceShellClassName } from "@/shared/components/layout/detail-metric-card";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { EntityDetailErrorState } from "@/shared/components/entity/entity-detail-error";
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
};

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
}: EntityDetailScreenProps<T>) {
  const listBack = useEntityDetailBack(listSection, listRoute);
  const { detail, loading, error, retry, dateFmt } = useEntityDetailScreen({
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
    retry,
    dateFmt,
    listBack,
  };
  const defaultSurface =
    loading ? (
      <EntityDetailLoadingSkeleton />
    ) : error ? (
      <EntityDetailErrorState message={error} retryLabel={labels.retry} onRetry={retry} />
    ) : detail && children ? (
      children({ detail, dateFmt, retry })
    ) : null;

  return (
    <div className={cn("min-h-0 w-full pb-8 sm:pb-10", className)}>
      <DetailPageHeader
        title={title}
        titleLoading={titleLoading}
        backHref={listBack}
        backAriaLabel={labels.backAria}
        subtitle={detail && subtitle ? subtitle(detail) : undefined}
        extension={headerExtension}
        actions={!loading && !error && detail && actions ? actions({ detail, listBack, retry }) : null}
      />

      <SurfaceShell className={cn(detailRecordSurfaceShellClassName, "mt-3")}>
        {renderSurface ? renderSurface(screenCtx) : defaultSurface}
      </SurfaceShell>

      {footer}
    </div>
  );
}
