"use client";

import * as React from "react";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchJobsPage } from "@/features/jobs/api/job.api";
import type { Job } from "@/features/jobs/types/job.types";
import { getJobClientId, getJobProjectId } from "@/features/jobs/utils/job-nested-fields.util";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import { fetchUserGroupsPage } from "@/features/user-groups/api/user-group.api";
import type { UserGroup } from "@/features/user-groups/types/user-group.types";
import {
  loadSchedulingTechnicians,
  type SchedulingTechnician,
} from "@/features/scheduling/utils/scheduling-technician.util";

export type SchedulingJobOption = {
  id: number;
  label: string;
  clientId: number | null;
  projectId: number | null;
};

export type SchedulingNamedOption = {
  id: number;
  name: string;
};

export type SchedulingProjectOption = {
  id: number;
  name: string;
  clientId: number | null;
};

type Catalog = {
  technicians: SchedulingTechnician[];
  clients: SchedulingNamedOption[];
  jobs: SchedulingJobOption[];
  projects: SchedulingProjectOption[];
  userGroups: UserGroup[];
};

let catalogCache: Catalog | null = null;
const CATALOG_VERSION = 2;
let catalogCacheVersion = 0;
let catalogPromise: Promise<Catalog> | null = null;
const jobsByClientCache = new Map<number, Job[]>();

export function invalidateSchedulingCatalog(): void {
  catalogCache = null;
  catalogPromise = null;
  catalogCacheVersion = 0;
  jobsByClientCache.clear();
}

export function jobSelectLabel(job: Job): string {
  const serial = job.job_serial_number?.trim();
  const title = job.title?.trim();
  if (serial && title) return `${serial} — ${title}`;
  return title || serial || `Job #${job.id}`;
}

async function loadCatalog(fallbackTechnicianTitle: string): Promise<Catalog> {
  const [technicians, clientsRes, jobsRes, projectsRes, groupsRes] = await Promise.all([
    loadSchedulingTechnicians(fallbackTechnicianTitle),
    fetchClientsPage(1, 500, { is_active: true }, { silent: true }),
    fetchJobsPage(1, 500, { is_active: true }, { silent: true }),
    fetchProjectsPage(1, 500, { is_active: true }).catch(() => ({ items: [] })),
    fetchUserGroupsPage(1, 500).catch(() => ({ items: [] as UserGroup[] })),
  ]);
  return {
    technicians,
    clients: clientsRes.items.map((c) => ({ id: c.id, name: c.name })),
    jobs: jobsRes.items.map((job) => ({
      id: job.id,
      label: jobSelectLabel(job),
      clientId: getJobClientId(job.client),
      projectId: getJobProjectId(job.project),
    })),
    projects: projectsRes.items.map((p) => ({
      id: p.id,
      name: p.name,
      clientId: typeof p.client === "number" ? p.client : (p.client?.id ?? null),
    })),
    userGroups: groupsRes.items,
  };
}

export function useSchedulingCatalog(fallbackTechnicianTitle: string) {
  const [catalog, setCatalog] = React.useState<Catalog | null>(
    catalogCache && catalogCacheVersion === CATALOG_VERSION ? catalogCache : null,
  );
  const [loading, setLoading] = React.useState(!(catalogCache && catalogCacheVersion === CATALOG_VERSION));
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (catalogCache && catalogCacheVersion === CATALOG_VERSION) {
      setCatalog(catalogCache);
      setLoading(false);
      return;
    }
    catalogCache = null;
    if (!catalogPromise) {
      catalogPromise = loadCatalog(fallbackTechnicianTitle)
        .then((data) => {
          catalogCache = data;
          catalogCacheVersion = CATALOG_VERSION;
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
  }, [fallbackTechnicianTitle]);

  return { catalog, loading, error };
}

export async function loadUnassignedJobsForClient(clientId: number): Promise<Job[]> {
  if (jobsByClientCache.has(clientId)) return jobsByClientCache.get(clientId)!;
  const { items } = await fetchJobsPage(1, 500, { client: clientId, is_active: true }, { silent: true });
  const scoped = items.filter((job) => getJobClientId(job.client) === clientId);
  jobsByClientCache.set(clientId, scoped);
  return scoped;
}
