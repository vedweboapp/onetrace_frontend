"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { Job } from "@/features/jobs/types/job.types";
import { jobToSiteAddressMapPoint } from "@/features/jobs/utils/job-site-map.util";
import type { AddressMapPoint } from "@/shared/components/maps/google-address-multi-mini-map";

const AddressMultiMiniMap = dynamic(
  () => import("@/shared/components/maps/address-multi-mini-map").then((m) => m.AddressMultiMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[min(70vh,560px)] min-h-[320px] w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
    ),
  },
);

type Props = {
  jobs: Job[];
  onJobClick: (jobId: number) => void;
};

export function JobsMapView({ jobs, onJobClick }: Props) {
  const t = useTranslations("Dashboard.jobs.mapView");

  const points = React.useMemo(() => {
    const next: AddressMapPoint[] = [];
    for (const job of jobs) {
      const point = jobToSiteAddressMapPoint(job);
      if (point) next.push(point);
    }
    return next;
  }, [jobs]);

  const skippedCount = jobs.length - points.length;

  const handlePointClick = React.useCallback(
    (point: AddressMapPoint) => {
      const id = typeof point.id === "number" ? point.id : Number.parseInt(String(point.id), 10);
      if (Number.isFinite(id) && id > 0) onJobClick(id);
    },
    [onJobClick],
  );

  if (points.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t("emptyTitle")}</p>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{t("emptyDescription")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-2 p-4 sm:p-6">
      {skippedCount > 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("skippedCount", { count: skippedCount })}
        </p>
      ) : null}
      <AddressMultiMiniMap
        points={points}
        onPointClick={handlePointClick}
        className="min-h-[min(70vh,560px)] flex-1"
        mapClassName="h-[min(70vh,560px)] min-h-[320px]"
      />
    </div>
  );
}
