"use client";

import { useTranslations } from "next-intl";
import { DetailEntityLink } from "@/shared/components/entity";
import { updateMaterialRequest } from "@/features/material-requests/api/material-request.api";
import type { MaterialRequestDetail } from "@/features/material-requests/types/material-request.types";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import { MaterialRequestStatusBadge } from "@/features/material-requests/components/material-request-status-badge";
import {
  materialRequestExtraItemName,
  materialRequestItemGroupName,
  materialRequestItemProductName,
  materialRequestJobClientId,
  materialRequestJobClientName,
  materialRequestJobProjectId,
  materialRequestJobProjectName,
  materialRequestJobSerial,
  materialRequestWorkerLabel,
  nestedId,
  normalizeMaterialRequestStatus,
} from "@/features/material-requests/utils/material-request-nested-fields.util";
import type { MaterialRequestItemSummary } from "@/features/material-requests/types/material-request.types";
import { DispatchedQuantityCell } from "@/shared/components/quantity/dispatched-quantity-cell";
import {
  quantityTableCellClass,
  quantityTableHeaderClass,
} from "@/shared/components/quantity/quantity-table-columns";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  DetailSectionCountBadge,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";
import { routes } from "@/shared/config/routes";
import {
  formatApiDateForHtmlDateInput,
  formatFlexibleApiDate,
} from "@/shared/utils/api-date-parse.util";
import { cn } from "@/core/utils/http.util";
import {
  DetailLinkedTable,
  DetailLinkedTableRow,
  DetailLinkedTableTd,
  detailLinkedTableCellClassName,
} from "@/shared/components/layout/detail-linked-table";

type Props = {
  detail: MaterialRequestDetail;
  workerName?: string;
  dateFmt: Intl.DateTimeFormat;
  dueFmt: Intl.DateTimeFormat;
  statusLabel: string;
  statusRow?: Pick<WorkflowColourStatus, "status_name" | "bg_colour" | "text_colour"> | null;
  /** Status select options from `useMaterialStatusCatalog()` on the detail screen. */
  statusOptions?: { value: string; label: string }[];
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
};

function itemRowsFromDetail(detail: MaterialRequestDetail): MaterialRequestItemSummary[] {
  if (detail.item_summaries?.length) return detail.item_summaries;
  return (detail.items ?? []).map((row, index) => ({
    group_key: `line-${index}`,
    item_id: nestedId(row.item) ?? 0,
    item_name: materialRequestItemProductName(row),
    group_name: materialRequestItemGroupName(row) !== "—" ? materialRequestItemGroupName(row) : null,
    requested_quantity: row.requested_quantity ?? row.quantity ?? 0,
    dispatched_quantity: row.dispatched_quantity ?? 0,
    fulfilled_quantity: row.dispatched_quantity ?? 0,
    surplus_quantity: 0,
    pending_quantity: row.pending_quantity ?? 0,
    restocked_quantity: row.restocked_quantity ?? 0,
  }));
}

function pendingTone(pending: number, requested: number): string {
  if (pending <= 0) return "text-slate-500 dark:text-slate-400";
  if (pending >= requested) return "font-semibold text-red-600 dark:text-red-400";
  return "font-semibold text-amber-600 dark:text-amber-400";
}

export function MaterialRequestDetailBody({
  detail,
  workerName,
  dateFmt,
  dueFmt,
  statusLabel,
  statusRow,
  statusOptions = [],
  onSaved,
}: Props) {
  const t = useTranslations("Dashboard.materialRequests");
  const tActions = useTranslations("Dashboard.common.actions");
  const extraItems = detail.extra_dispatch_items ?? [];
  const dispatchIds = detail.dispatch_ids ?? [];
  const itemRows = itemRowsFromDetail(detail);
  const showRestockedColumn = itemRows.some((row) => row.restocked_quantity > 0);
  const statusValue = normalizeMaterialRequestStatus(detail.status);
  const notes = detail.notes?.trim() ?? "";

  const patchField = useDetailPatch(
    (body: Parameters<typeof updateMaterialRequest>[1]) => updateMaterialRequest(detail.id, body),
    { success: t("updatedToast"), error: t("loadError") },
    onSaved,
  );

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
      <DetailPanelCard title={t("detail.sectionOverview")}>
        <DetailMetricsGrid>
          <DetailMetricCard label={t("fields.workerName")}>
            {nestedId(detail.worker_name) != null ? (
              <DetailEntityLink
                href={`${routes.dashboard.settingsUsers}/${nestedId(detail.worker_name)}`}
                className="font-medium text-blue-600 underline-offset-2 hover:underline"
              >
                {materialRequestWorkerLabel(detail.worker_name, workerName)}
              </DetailEntityLink>
            ) : (
              materialRequestWorkerLabel(detail.worker_name, workerName)
            )}
          </DetailMetricCard>
          {statusOptions.length > 0 ? (
            <DetailEditableField
              label={t("fields.status")}
              value={statusValue}
              kind="select"
              options={statusOptions}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ status: next })}
            >
              <MaterialRequestStatusBadge status={detail.status} label={statusLabel} statusRow={statusRow} />
            </DetailEditableField>
          ) : (
            <DetailMetricCard label={t("fields.status")}>
              <MaterialRequestStatusBadge status={detail.status} label={statusLabel} statusRow={statusRow} />
            </DetailMetricCard>
          )}
          <DetailEditableField
            label={t("fields.requestedDate")}
            value={formatApiDateForHtmlDateInput(detail.requested_date)}
            kind="text"
            required
            requiredMessage={t("validation.requestedDate")}
            editAriaLabel={tActions("edit")}
            onSave={(next) => patchField({ requested_date: next })}
          >
            {formatFlexibleApiDate(detail.requested_date, dueFmt)}
          </DetailEditableField>
          <DetailEditableField
            label={t("fields.notes")}
            value={notes}
            kind="text"
            multiline
            textareaBox
            editAriaLabel={tActions("edit")}
            empty="—"
            onSave={(next) => patchField({ notes: next })}
          />
        </DetailMetricsGrid>
      </DetailPanelCard>

      {dispatchIds.length > 0 ? (
        <DetailPanelCard title={t("detail.sectionDispatches")}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {dispatchIds.map((dispatchId) => (
              <li key={dispatchId} className="py-3 first:pt-0 last:pb-0">
                <DetailEntityLink
                  href={`${routes.dashboard.dispatches}/${dispatchId}`}
                  className="font-semibold text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  {t("detail.dispatchLink")}
                </DetailEntityLink>
              </li>
            ))}
          </ul>
        </DetailPanelCard>
      ) : null}

      <DetailPanelCard
        title={t("detail.sectionJobs")}
        badge={
          (detail.jobs ?? []).length > 0 ? (
            <DetailSectionCountBadge count={(detail.jobs ?? []).length} />
          ) : null
        }
        toggleAriaLabel={t("sections.toggle")}
      >
        {(detail.jobs ?? []).length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("jobs.empty")}</p>
        ) : (
          <DetailLinkedTable
            showRowNumbers={false}
            columns={[
              { id: "job", header: t("table.jobName"), widthClass: "w-[28%]" },
              { id: "client", header: t("fields.clientName"), widthClass: "w-[36%]" },
              { id: "project", header: t("fields.projectName"), widthClass: "w-[36%]" },
            ]}
          >
            {(detail.jobs ?? []).map((job, index) => {
              const clientId = materialRequestJobClientId(job);
              const clientName = materialRequestJobClientName(job);
              const projectId = materialRequestJobProjectId(job);
              const projectName = materialRequestJobProjectName(job);
              const entityLinkClass = "text-blue-600 underline-offset-2 hover:underline";
              return (
                <DetailLinkedTableRow key={job.id} index={index}>
                  <DetailLinkedTableTd
                    className={detailLinkedTableCellClassName({
                      align: "left",
                      cellClassName: "font-medium text-slate-900 dark:text-slate-100",
                    })}
                  >
                    <DetailEntityLink
                      href={`${routes.dashboard.jobs}/${job.id}`}
                      className={entityLinkClass}
                    >
                      {materialRequestJobSerial(job)}
                    </DetailEntityLink>
                  </DetailLinkedTableTd>
                  <DetailLinkedTableTd className={detailLinkedTableCellClassName({})}>
                    {clientId != null ? (
                      <DetailEntityLink
                        href={`${routes.dashboard.clients}/${clientId}`}
                        className={entityLinkClass}
                      >
                        {clientName}
                      </DetailEntityLink>
                    ) : (
                      clientName
                    )}
                  </DetailLinkedTableTd>
                  <DetailLinkedTableTd className={detailLinkedTableCellClassName({})}>
                    {projectId != null ? (
                      <DetailEntityLink
                        href={`${routes.dashboard.projects}/${projectId}`}
                        className={entityLinkClass}
                      >
                        {projectName}
                      </DetailEntityLink>
                    ) : (
                      projectName
                    )}
                  </DetailLinkedTableTd>
                </DetailLinkedTableRow>
              );
            })}
          </DetailLinkedTable>
        )}
      </DetailPanelCard>

      <DetailPanelCard
        title={t("detail.sectionItems")}
        badge={
          itemRows.length > 0 ? <DetailSectionCountBadge count={itemRows.length} /> : null
        }
        toggleAriaLabel={t("sections.toggle")}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                <th className="px-3 py-2">{t("lineItems.itemDetails")}</th>
                <th className={quantityTableHeaderClass}>{t("dispatch.requested")}</th>
                <th className={quantityTableHeaderClass}>{t("dispatch.dispatched")}</th>
                <th className={quantityTableHeaderClass}>{t("dispatch.pending")}</th>
                {showRestockedColumn ? (
                  <th className={quantityTableHeaderClass}>{t("restock.column")}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {itemRows.length === 0 ? (
                <tr>
                  <td colSpan={showRestockedColumn ? 5 : 4} className="px-3 py-6 text-center text-slate-500">
                    {t("lineItems.empty")}
                  </td>
                </tr>
              ) : (
                itemRows.map((row) => {
                  const meta = row.group_name?.trim() ? row.group_name : null;
                  return (
                    <tr key={row.group_key} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{row.item_name}</p>
                        {meta ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta}</p> : null}
                      </td>
                      <td className={cn(quantityTableCellClass, "font-medium")}>
                        {row.requested_quantity.toFixed(0)} {t("lineItems.units")}
                      </td>
                      <td className={quantityTableCellClass}>
                        <DispatchedQuantityCell
                          fulfilled={row.fulfilled_quantity}
                          surplus={row.surplus_quantity}
                          unitsLabel={t("lineItems.units")}
                        />
                      </td>
                      <td
                        className={cn(
                          quantityTableCellClass,
                          pendingTone(row.pending_quantity, row.requested_quantity),
                        )}
                      >
                        {row.pending_quantity.toFixed(0)} {t("lineItems.units")}
                      </td>
                      {showRestockedColumn ? (
                        <td className={cn(quantityTableCellClass, "text-emerald-700 dark:text-emerald-400")}>
                          {row.restocked_quantity > 0
                            ? `${row.restocked_quantity.toFixed(0)} ${t("lineItems.units")}`
                            : `0 ${t("lineItems.units")}`}
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DetailPanelCard>

      {extraItems.length > 0 ? (
        <DetailPanelCard title={t("dispatch.sectionExtraSent")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <th className="pb-2 pr-3">{t("lineItems.itemDetails")}</th>
                  <th className="pb-2 text-center w-32 whitespace-nowrap">{t("dispatch.dispatched")}</th>
                  <th className="pb-2 text-right">{t("fields.updatedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {extraItems.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 pr-3 font-medium text-slate-900 dark:text-slate-100">
                      {materialRequestExtraItemName(row)}
                    </td>
                    <td className="py-3 text-center tabular-nums whitespace-nowrap">
                      {row.quantity.toFixed(0)} {t("lineItems.units")}
                    </td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {row.dispatched_at
                        ? formatFlexibleApiDate(row.dispatched_at, dateFmt)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailPanelCard>
      ) : null}

      <DetailSystemMetadataSection
        createdAt={detail.created_at ?? new Date().toISOString()}
        modifiedAt={detail.modified_at}
        dateFmt={dateFmt}
        createdBy={detail.created_by}
        modifiedBy={detail.modified_by}
        labels={{
          sectionTitle: t("detail.sectionSystemMetadata"),
          createdAt: t("fields.createdAt"),
          updatedAt: t("fields.updatedAt"),
          createdBy: t("fields.createdBy"),
          modifiedBy: t("fields.modifiedBy"),
          notModifiedYet: t("detail.notModifiedYet"),
        }}
      />
      </div>
    </DetailPagePadding>
  );
}
