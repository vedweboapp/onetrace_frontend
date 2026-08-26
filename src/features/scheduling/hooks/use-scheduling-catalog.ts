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
const CATALOG_VERSION = 6;
let techniciansCacheVersion = 0;
let filterCacheVersion = 0;
let techniciansCache: SchedulingTechnician[] | null = null;
let techniciansPromise: Promise<SchedulingTechnician[]> | null = null;
let filterCache: FilterCatalog | null = null;
let filterPromise: Promise<FilterCatalog> | null = null;
const filterSubscribers = new Set<(next: FilterCatalog) => void>();
const jobsByClientCache = new Map<number, Job[]>();

const EMPTY_FILTERS: FilterCatalog = {
  clients: [],
  jobs: [],
  projects: [],
  userGroups: [],
};

function publishFilterCatalog(next: FilterCatalog) {
  filterCache = next;
  filterCacheVersion = CATALOG_VERSION;
  filterSubscribers.forEach((fn) => fn(next));
}

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

/**
 * Loads filter catalogs in parallel and publishes each resource as soon as it
 * resolves so clients/groups/projects appear without waiting on the slowest call.
 */
async function loadFilterCatalog(options?: { force?: boolean }): Promise<FilterCatalog> {
  if (!options?.force && filterCache && filterCacheVersion === CATALOG_VERSION) {
    return filterCache;
  }
  // Always join an in-flight load (even when force) to avoid duplicate Promise.all work.
  if (filterPromise) return filterPromise;

  let partial: FilterCatalog =
    filterCache && filterCacheVersion === CATALOG_VERSION
      ? { ...filterCache }
      : { ...EMPTY_FILTERS };

  const publish = (patch: Partial<FilterCatalog>) => {
    partial = { ...partial, ...patch };
    publishFilterCatalog(partial);
  };

  const run = (async () => {
    await Promise.all([
      fetchClientsPage(1, 500, { is_active: true }, { silent: true })
        .then((res) => {
          publish({
            clients: res.items.map((c) => ({ id: c.id, name: c.name })),
          });
        })
        .catch(() => {
          if (partial.clients.length === 0) publish({ clients: [] });
        }),
      fetchJobsPage(1, 500, { is_active: true }, { silent: true })
        .then((res) => {
          publish({
            jobs: res.items.map((job) => ({
              id: job.id,
              label: jobSelectLabel(job),
              clientId: getJobClientId(job.client),
              projectId: getJobProjectId(job.project),
            })),
          });
        })
        .catch(() => {
          if (partial.jobs.length === 0) publish({ jobs: [] });
        }),
      fetchProjectsPage(1, 500, { is_active: true })
        .then((res) => {
          publish({
            projects: res.items.map((p) => ({
              id: p.id,
              name: p.name,
              clientId: typeof p.client === "number" ? p.client : (p.client?.id ?? null),
            })),
          });
        })
        .catch(() => {
          if (partial.projects.length === 0) publish({ projects: [] });
        }),
      fetchUserGroupsPage(1, 100)
        .then((groupsRes) => {
          publish({
            userGroups: Array.isArray(groupsRes.items) ? groupsRes.items : [],
          });
        })
        .catch(() => {
          // Keep prior groups on transient failure — do not wipe a good cache.
        }),
    ]);
    return partial;
  })();

  filterPromise = run;
  void run.finally(() => {
    if (filterPromise === run) filterPromise = null;
  });
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
  const [filtersLoading, setFiltersLoading] = React.useState(
    includeFilters && !(filterCache && filterCacheVersion === CATALOG_VERSION),
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
    if (!includeFilters) {
      setFiltersLoading(false);
      return;
    }

    let cancelled = false;
    const onUpdate = (next: FilterCatalog) => {
      if (!cancelled) setFilters(next);
    };
    filterSubscribers.add(onUpdate);

    const cached = filterCache && filterCacheVersion === CATALOG_VERSION ? filterCache : null;
    if (cached) {
      setFilters(cached);
      setFiltersLoading(false);
    } else {
      setFiltersLoading(true);
    }

    void loadFilterCatalog()
      .then((next) => {
        if (!cancelled) setFilters(next);
      })
      .catch(() => {
        if (!cancelled) {
          setFilters((prev) =>
            prev.clients.length > 0 || prev.projects.length > 0 || prev.userGroups.length > 0
              ? prev
              : EMPTY_FILTERS,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setFiltersLoading(false);
      });

    return () => {
      cancelled = true;
      filterSubscribers.delete(onUpdate);
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

  return { catalog, loading, filtersLoading, error };
}

export async function loadUnassignedJobsForClient(clientId: number): Promise<Job[]> {
  if (jobsByClientCache.has(clientId)) return jobsByClientCache.get(clientId)!;
  const { items } = await fetchJobsPage(1, 500, { client: clientId, is_active: true }, { silent: true });
  const scoped = items.filter((job) => getJobClientId(job.client) === clientId);
  jobsByClientCache.set(clientId, scoped);
  return scoped;
}
