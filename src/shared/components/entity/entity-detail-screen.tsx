"use client";

import type { ReactNode } from "react";
import { detailRecordSurfaceShellClassName } from "@/shared/components/layout/detail-metric-card";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { EntityDetailErrorState } from "@/shared/components/entity/entity-detail-error";
import { EntityDetailLoadingSkeleton } from "@/shared/components/entity/entity-detail-loading";
import { useEntityDetailBack } from "@/shared/hooks/use-entity-detail-back";
import { useEntityDetailScreen } from "@/shared/hooks/use-entity-detail-screen";
import type { DashboardListSection } from "@/shared/utils/detail-from-list.util";
import { SurfaceShell } from "@/shared/ui";

export type EntityDetailScreenLabels = {
  loadingTitle: string;
  metaTitle: string;
  backAria: string;
  retry: string;
};

export type EntityDetailScreenProps<T> = {
  entityId: number;
  listSection: DashboardListSection;
  listRoute: string;
  labels: EntityDetailScreenLabels;
  loadError: string;
  fetch: (id: number) => Promise<T>;
  getTitle: (detail: T) => string;
  /** Optional header subtitle — omit globally by not passing from any feature. */
  subtitle?: (detail: T) => ReactNode;
  actions?: (ctx: { detail: T; listBack: string }) => ReactNode;
  children: (ctx: { detail: T; dateFmt: Intl.DateTimeFormat }) => ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Entity detail page shell: back header, loading/error states, record surface.
 * Features only supply data fetch, title, actions, and body content.
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
  footer,
  className,
}: EntityDetailScreenProps<T>) {
  const listBack = useEntityDetailBack(listSection, listRoute);
  const { detail, loading, error, retry, dateFmt } = useEntityDetailScreen({
    entityId,
    fetch,
    loadError,
  });

  const title = detail ? getTitle(detail) : loading ? labels.loadingTitle : labels.metaTitle;

  return (
    <div className={className ?? "pb-8 sm:pb-10"}>
      <DetailPageHeader
        title={title}
        backHref={listBack}
        backAriaLabel={labels.backAria}
        subtitle={detail && subtitle ? subtitle(detail) : undefined}
        actions={!loading && !error && detail && actions ? actions({ detail, listBack }) : null}
      />

      <SurfaceShell className={detailRecordSurfaceShellClassName}>
        {loading ? (
          <EntityDetailLoadingSkeleton />
        ) : error ? (
          <EntityDetailErrorState message={error} retryLabel={labels.retry} onRetry={retry} />
        ) : detail ? (
          children({ detail, dateFmt })
        ) : null}
      </SurfaceShell>

      {footer}
    </div>
  );
}
