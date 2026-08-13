"use client";

import * as React from "react";
import type { Job } from "@/features/jobs/types/job.types";
import { SchedulingPanel } from "@/features/scheduling/components/scheduling-panel";
import { cn } from "@/core/utils/http.util";

type Props = {
  detail: Job;
};

export function JobSchedulingTab({ detail }: Props) {
  return (
    <div
      className={cn(
        "flex min-h-[24rem] flex-col overflow-hidden",
        "h-[calc(100dvh-12rem)] sm:h-[calc(100dvh-11rem)]",
      )}
    >
      <SchedulingPanel syncUrl={false} defaultJobId={detail.id} />
    </div>
  );
}
