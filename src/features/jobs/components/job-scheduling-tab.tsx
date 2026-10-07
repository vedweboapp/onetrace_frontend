"use client";

import * as React from "react";
import type { Job } from "@/features/jobs/types/job.types";
import {
  getJobAssignedWorkerId,
  getJobClientId,
  getJobProjectId,
} from "@/features/jobs/utils/job-nested-fields.util";
import { SchedulingPanel } from "@/features/scheduling/components/scheduling-panel";

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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
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
