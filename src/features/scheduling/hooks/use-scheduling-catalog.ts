"use client";

import * as React from "react";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchJobsPage } from "@/features/jobs/api/job.api";
import type { Job } from "@/features/jobs/types/job.types";
import { getJobClientId } from "@/features/jobs/utils/job-nested-fields.util";
import {
  loadSchedulingTechnicians,
  type SchedulingTechnician,
} from "@/features/scheduling/utils/scheduling-technician.util";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";

type Catalog = {
  technicians: SchedulingTechnician[];
  clientOptions: CheckmarkSelectOption[];
};

let catalogCache: Catalog | null = null;
let catalogPromise: Promise<Catalog> | null = null;
const jobsByClientCache = new Map<number, Job[]>();

export function invalidateSchedulingCatalog(): void {
  catalogCache = null;
  catalogPromise = null;
  jobsByClientCache.clear();
}

async function loadCatalog(fallbackTechnicianTitle: string, allClientsLabel: string): Promise<Catalog> {
  const [technicians, clientsRes] = await Promise.all([
    loadSchedulingTechnicians(fallbackTechnicianTitle),
    fetchClientsPage(1, 500, { is_active: true }, { silent: true }),
  ]);
  return {
    technicians,
    clientOptions: [
      { value: "", label: allClientsLabel },
      ...clientsRes.items.map((c) => ({ value: String(c.id), label: c.name })),
    ],
  };
}

export function useSchedulingCatalog(fallbackTechnicianTitle: string, allClientsLabel: string) {
  const [catalog, setCatalog] = React.useState<Catalog | null>(catalogCache);
  const [loading, setLoading] = React.useState(!catalogCache);
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (catalogCache) {
      setCatalog(catalogCache);
      setLoading(false);
      return;
    }
    if (!catalogPromise) {
      catalogPromise = loadCatalog(fallbackTechnicianTitle, allClientsLabel)
        .then((data) => {
          catalogCache = data;
          return data;
        })
        .finally(() => {
          catalogPromise = null;
        });
    }
    let cancelled = false;
    setLoading(true);
    catalogPromise
      .then((data) => {
        if (!cancelled) {
          setCatalog(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setCatalog(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fallbackTechnicianTitle, allClientsLabel]);

  return { catalog, loading, error };
}

export async function loadUnassignedJobsForClient(clientId: number): Promise<Job[]> {
  if (jobsByClientCache.has(clientId)) return jobsByClientCache.get(clientId)!;
  const { items } = await fetchJobsPage(1, 500, { client: clientId, is_active: true }, { silent: true });
  const scoped = items.filter((job) => {
    const cid = getJobClientId(job.client);
    return cid === clientId;
  });
  jobsByClientCache.set(clientId, scoped);
  return scoped;
}

export function jobSelectLabel(job: Job): string {
  const serial = job.job_serial_number?.trim();
  const title = job.title?.trim();
  if (serial && title) return `${serial} — ${title}`;
  return title || serial || `Job #${job.id}`;
}
