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

export type SchedulingCatalog = {
  technicians: SchedulingTechnician[];
  clients: SchedulingNamedOption[];
  jobs: SchedulingJobOption[];
  projects: SchedulingProjectOption[];
  userGroups: UserGroup[];
};

type FilterCatalog = Pick<SchedulingCatalog, "clients" | "jobs" | "projects" | "userGroups">;

/** Bump when filter/technician shape changes so in-memory caches reset. */
const CATALOG_VERSION = 5;
let techniciansCacheVersion = 0;
let filterCacheVersion = 0;
let techniciansCache: SchedulingTechnician[] | null = null;
let techniciansPromise: Promise<SchedulingTechnician[]> | null = null;
let filterCache: FilterCatalog | null = null;
let filterPromise: Promise<FilterCatalog> | null = null;
const jobsByClientCache = new Map<number, Job[]>();

const EMPTY_FILTERS: FilterCatalog = {
  clients: [],
  jobs: [],
  projects: [],
  userGroups: [],
};

export function invalidateSchedulingCatalog(): void {
  techniciansCache = null;
  techniciansPromise = null;
  filterCache = null;
  filterPromise = null;
  techniciansCacheVersion = 0;
  filterCacheVersion = 0;
  jobsByClientCache.clear();
}

export function jobSelectLabel(job: Job): string {
  const serial = job.job_serial_number?.trim();
  const title = job.title?.trim();
  if (serial && title) return `${serial} — ${title}`;
  return title || serial || `Job #${job.id}`;
}

async function loadTechnicians(fallbackTechnicianTitle: string): Promise<SchedulingTechnician[]> {
  if (techniciansCache && techniciansCacheVersion === CATALOG_VERSION) return techniciansCache;
  if (!techniciansPromise) {
    techniciansPromise = loadSchedulingTechnicians(fallbackTechnicianTitle)
      .then((rows) => {
        techniciansCache = rows;
        techniciansCacheVersion = CATALOG_VERSION;
        return rows;
      })
      .finally(() => {
        techniciansPromise = null;
      });
  }
  return techniciansPromise;
}

async function loadFilterCatalog(options?: { force?: boolean }): Promise<FilterCatalog> {
  if (!options?.force && filterCache && filterCacheVersion === CATALOG_VERSION) {
    return filterCache;
  }
  if (!options?.force && filterPromise) return filterPromise;

  const run = Promise.all([
    fetchClientsPage(1, 500, { is_active: true }, { silent: true }).catch(() => ({ items: [] })),
    fetchJobsPage(1, 500, { is_active: true }, { silent: true }).catch(() => ({ items: [] })),
    fetchProjectsPage(1, 500, { is_active: true }).catch(() => ({ items: [] })),
    // Do not swallow failures into a cached empty list — that permanently hides groups
    // in the scheduling filter after a single transient error.
    fetchUserGroupsPage(1, 100),
  ])
    .then(([clientsRes, jobsRes, projectsRes, groupsRes]) => {
      const next: FilterCatalog = {
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
        userGroups: Array.isArray(groupsRes.items) ? groupsRes.items : [],
      };
      filterCache = next;
      filterCacheVersion = CATALOG_VERSION;
      return next;
    })
    .finally(() => {
      if (filterPromise === run) filterPromise = null;
    });

  filterPromise = run;
  return run;
}

export function useSchedulingCatalog(
  fallbackTechnicianTitle: string,
  options?: { includeFilters?: boolean },
) {
  const includeFilters = Boolean(options?.includeFilters);
  const [technicians, setTechnicians] = React.useState<SchedulingTechnician[]>(
    techniciansCache && techniciansCacheVersion === CATALOG_VERSION ? techniciansCache : [],
  );
  const [filters, setFilters] = React.useState<FilterCatalog>(
    filterCache && filterCacheVersion === CATALOG_VERSION ? filterCache : EMPTY_FILTERS,
  );
  const [loading, setLoading] = React.useState(
    !(techniciansCache && techniciansCacheVersion === CATALOG_VERSION),
  );
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(!(techniciansCache && techniciansCacheVersion === CATALOG_VERSION));
    loadTechnicians(fallbackTechnicianTitle)
      .then((rows) => {
        if (!cancelled) {
          setTechnicians(rows);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setTechnicians([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fallbackTechnicianTitle]);

  React.useEffect(() => {
    if (!includeFilters) return;
    let cancelled = false;

    const cached = filterCache && filterCacheVersion === CATALOG_VERSION ? filterCache : null;
    // Refetch when cache is missing OR groups were never populated (stale empty from older builds).
    const needsFetch = !cached || cached.userGroups.length === 0;

    if (cached && cached.userGroups.length > 0) {
      setFilters(cached);
      return;
    }

    void loadFilterCatalog({ force: needsFetch && Boolean(cached) })
      .then((next) => {
        if (!cancelled) setFilters(next);
      })
      .catch(() => {
        if (!cancelled) {
          // Keep prior non-empty groups if a refresh fails; otherwise clear.
          setFilters((prev) => (prev.userGroups.length > 0 ? prev : EMPTY_FILTERS));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [includeFilters]);

  const catalog = React.useMemo<SchedulingCatalog>(
    () => ({
      technicians,
      clients: filters.clients,
      jobs: filters.jobs,
      projects: filters.projects,
      userGroups: filters.userGroups,
    }),
    [technicians, filters],
  );

  return { catalog, loading, error };
}

export async function loadUnassignedJobsForClient(clientId: number): Promise<Job[]> {
  if (jobsByClientCache.has(clientId)) return jobsByClientCache.get(clientId)!;
  const { items } = await fetchJobsPage(1, 500, { client: clientId, is_active: true }, { silent: true });
  const scoped = items.filter((job) => getJobClientId(job.client) === clientId);
  jobsByClientCache.set(clientId, scoped);
  return scoped;
}
