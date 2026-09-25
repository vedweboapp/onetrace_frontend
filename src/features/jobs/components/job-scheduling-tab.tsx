"use client";

import * as React from "react";
import type { Job } from "@/features/jobs/types/job.types";
import {
  getJobAssignedWorkerId,
  getJobClientId,
  getJobProjectId,
} from "@/features/jobs/utils/job-nested-fields.util";
import { SchedulingPanel } from "@/features/scheduling/components/scheduling-panel";
import { cn } from "@/core/utils/http.util";

type Props = {
  detail: Job;
  /** Refresh job detail after schedule create/delete (assigned workers). */
  onJobSchedulesChanged?: () => void;
};

export function JobSchedulingTab({ detail, onJobSchedulesChanged }: Props) {
  const clientId = getJobClientId(detail.client);
  const projectId = getJobProjectId(detail.project);
  const assignedWorkerId = getJobAssignedWorkerId(detail);
  return (
    <div
      className={cn(
        "flex min-h-[24rem] flex-col overflow-hidden",
        "h-[calc(100dvh-12rem)] sm:h-[calc(100dvh-11rem)]",
      )}
    >
      <SchedulingPanel
        syncUrl={false}
        defaultJobId={detail.id}
        defaultClientId={clientId ?? undefined}
        defaultProjectId={projectId ?? undefined}
        defaultAssignedWorkerId={assignedWorkerId ?? undefined}
        defaultJobSerial={detail.job_serial_number ?? undefined}
        onJobSchedulesChanged={onJobSchedulesChanged}
      />
    </div>
  );
}
