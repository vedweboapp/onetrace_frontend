"use client";

import { EntityAuditTimeline } from "@/features/audit-trails/components/entity-audit-timeline";
import { AUDIT_TRAIL_MODULES } from "@/features/audit-trails/constants/audit-trail-modules";

type Props = {
  materialRequestId: number;
  dateFmt: Intl.DateTimeFormat;
};

/** @deprecated Prefer `EntityAuditTimeline` with `AUDIT_TRAIL_MODULES.materialRequest`. */
export function MaterialRequestDetailTimeline({ materialRequestId, dateFmt }: Props) {
  return (
    <EntityAuditTimeline
      module={AUDIT_TRAIL_MODULES.materialRequest}
      objectId={materialRequestId}
      dateFmt={dateFmt}
    />
  );
}
