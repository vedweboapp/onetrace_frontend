"use client";

import * as React from "react";
import { fetchProject } from "@/features/projects/api/project.api";
import ProjectPinsListTab from "@/features/projects/components/project-pins-list-tab";
import type { ProjectSiteRef } from "@/features/projects/types/project.types";
import { EntityDetailTabLoadingState } from "@/shared/components/entity";

type Props = {
  projectId: number;
};

export function QuotationLocationsTab({ projectId }: Props) {
  const [sites, setSites] = React.useState<Array<number | ProjectSiteRef> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const project = await fetchProject(projectId);
        if (!cancelled) setSites(project.sites ?? []);
      } catch {
        if (!cancelled) setSites([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) return <EntityDetailTabLoadingState />;

  return <ProjectPinsListTab sites={sites} projectId={projectId} />;
}
