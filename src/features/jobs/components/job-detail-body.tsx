"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Job } from "@/features/jobs/types/job.types";
import { JobFormsSection } from "@/features/job-forms/components/job-forms-section";
import { JobChecklistsSection } from "@/features/jobs/components/job-checklists-section";
import {
  getJobStatusRow,
  jobAssignedWorkerLabel,
  jobChecklistEntries,
  jobChecklistIsMarked,
  jobClientLabel,
  jobFormEntries,
  jobProjectLabel,
  jobSiteLabel,
} from "@/features/jobs/utils/job-nested-fields.util";
import {
  normalizeJobMeta,
  resolveJobMetaCompositeItemId,
} from "@/features/jobs/utils/job-meta-payload.util";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import {
  DetailLinkedTable,
  DetailLinkedTableRow,
  DetailLinkedTableTd,
  detailLinkedTableCellClassName,
} from "@/shared/components/layout/detail-linked-table";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { cn } from "@/core/utils/http.util";
import { Layers, MapPinned } from "lucide-react";
import { DrawingPinPreviewModal } from "@/features/projects/components/drawing-pin-preview-modal";
import type { DrawingPin, DrawingPlot } from "@/features/projects/types/drawing.types";

type JobDrawingPlot = Omit<DrawingPlot, "coordinates"> & {
  coordinates?: number[][];
  pins?: DrawingPin[];
};

type JobDrawingLevel = {
  id: number;
  name: string;
  drawing_file: string;
  plots?: JobDrawingPlot[];
};

const PIN_TABLE_GRID =
  "grid min-w-0 w-full max-w-full grid-cols-[minmax(0,4rem)_minmax(0,1fr)_minmax(0,0.5fr)_minmax(0,0.4fr)_minmax(0,0.7fr)_minmax(0,0.5fr)_minmax(0,3rem)] items-center gap-x-3 sm:gap-x-4";

const PIN_TABLE_HEADER_CLASS = cn(
  PIN_TABLE_GRID,
  "border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
);

const PIN_TABLE_ROW_CLASS = cn(
  PIN_TABLE_GRID,
  "px-4 py-3 text-sm transition-colors border-b border-slate-100 last:border-b-0 dark:border-slate-800/80",
);

function PinStatusChip({ pin }: { pin: DrawingPin }) {
  const sd = pin.status_detail;
  if (!sd) return <span className="text-xs text-slate-500">—</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold animate-fade-in"
      style={{
        backgroundColor: sd.bg_colour || "#e2e8f0",
        color: sd.text_colour || "#475569",
      }}
    >
      {sd.status_name}
    </span>
  );
}

function ProjectPinTableHeader() {
  const locale = useLocale();
  const isEs = locale === "es";
  return (
    <div className={PIN_TABLE_HEADER_CLASS}>
      <span>Pin ID</span>
      <span>Product</span>
      <span>{isEs ? "Variación" : "Variation"}</span>
      <span>Quantity</span>
      <span>Form</span>
      <span>Status</span>
      <span className="sr-only">Actions</span>
    </div>
  );
}

function ProjectPinRow({
  pin,
  form,
  onPreview,
}: {
  pin: DrawingPin;
  form?: { label: string; href: string; projectFormId: number } | null;
  onPreview: () => void;
}) {
  const locale = useLocale();
  const isEs = locale === "es";
  const productName = pin.item_detail?.name || pin.group_detail?.name || "Pin";
  const sku = pin.item_detail?.sku;
  const variationText = pin.variation ? (isEs ? "Sí" : "Yes") : (isEs ? "No" : "No");

  return (
    <div className={cn(PIN_TABLE_ROW_CLASS, "hover:bg-slate-50/90 dark:hover:bg-slate-800/30")}>
      <span className="font-semibold text-slate-500">#{pin.id}</span>
      <div className="flex flex-col min-w-0 pl-4">
  <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{productName}</span>
  {sku && <span className="text-xs text-slate-400 truncate">{sku}</span>}
</div>
      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
        {variationText}
      </span>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{pin.quantity ?? 1}</span>
      <div className="min-w-0">
        {form ? (
          <a
            href={form.href}
            className="inline-flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-(--dash-accent) hover:text-(--dash-accent) dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
          >
            <span className="truncate">{form.label}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              #{form.projectFormId}
            </span>
          </a>
        ) : (
          <span className="text-xs text-slate-500">—</span>
        )}
      </div>
      <div>
        <PinStatusChip pin={pin} />
      </div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          title="Preview on Drawing"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <MapPinned className="size-4" />
        </button>
      </div>
    </div>
  );
}

function PlotPinsBlock({
  plotName,
  pins,
  onPreviewPin,
  getPinForm,
}: {
  plotName: string;
  pins: DrawingPin[];
  onPreviewPin: (pin: DrawingPin) => void;
  getPinForm: (pin: DrawingPin) => { label: string; href: string; projectFormId: number } | null;
}) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-950/30">
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950/40">
        <Layers className="size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
        <span className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{plotName}</span>
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {pins.length === 1 ? "1 Pin" : `${pins.length} Pins`}
        </span>
      </div>
      <div className="min-w-0 w-full overflow-x-auto">
        {pins.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center bg-slate-50/30 dark:bg-transparent">
            No pins in this plot.
          </p>
        ) : (
          <>
            <ProjectPinTableHeader />
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {pins.map((pin) => (
                <ProjectPinRow
                  key={pin.id}
                  pin={pin}
                  form={getPinForm(pin)}
                  onPreview={() => onPreviewPin(pin)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function JobDetailBody({
  detail,
  dateFmt,
  workerLabel,
  onChecklistsUpdated,
}: {
  detail: Job;
  dateFmt: Intl.DateTimeFormat;
  workerLabel?: string;
  onChecklistsUpdated?: () => void;
}) {
  const t = useTranslations("Dashboard.jobs");
  const tMeta = useTranslations("Dashboard.common.detail");
  const locale = useLocale();

  const [previewPinData, setPreviewPinData] = React.useState<{
    pin: DrawingPin;
    plots: DrawingPlot[];
    drawingFile: string;
    drawingName: string;
  } | null>(null);

  const levels = React.useMemo(() => {
    const typedDetail = detail as unknown as { levels?: JobDrawingLevel[]; level?: JobDrawingLevel | JobDrawingLevel[] };
    const rawLevels = typedDetail.levels ?? typedDetail.level;
    if (!rawLevels) return [];
    return Array.isArray(rawLevels) ? rawLevels : [rawLevels];
  }, [detail]);
  const statusRow = getJobStatusRow(detail);
  const meta = normalizeJobMeta(detail.job_meta);
  const compositeRows = meta?.composite_items ?? [];
  const formEntries = jobFormEntries(detail);
  const checklistEntries = jobChecklistEntries(detail);
  const checklistMarked = jobChecklistIsMarked(detail);

  const getPinForm = React.useCallback(
    (pin: DrawingPin) => {
      const pinProjectFormId =
        typeof pin.formId === "number"
          ? pin.formId
          : typeof pin.project_form === "number"
          ? pin.project_form
          : pin.project_form && typeof pin.project_form === "object"
          ? pin.project_form.id
          : null;
      if (pinProjectFormId == null) return null;

      const form = formEntries.find(
        (entry) => entry.project_form_id === pinProjectFormId || entry.id === pinProjectFormId,
      );

      const projectFormName =
        pin.project_form && typeof pin.project_form === "object" && pin.project_form.name
          ? pin.project_form.name.trim()
          : undefined;

      const label = form?.name?.trim() || projectFormName || `#${pinProjectFormId}`;
      const jobFormId = form?.id ?? pinProjectFormId;
      const projectFormId = form?.project_form_id ?? pinProjectFormId;

      const baseHref = `${routes.dashboard.jobFormFill(detail.id, projectFormId, jobFormId)}&name=${encodeURIComponent(
        label,
      )}&back=${encodeURIComponent(`${routes.dashboard.jobs}/${detail.id}`)}&job_pin_id=${Number(pin.job_pin_id)}`;
      const submissionId =
        typeof form?.submitted_form_id === "number" && form.submitted_form_id > 0 ? form.submitted_form_id : null;

      return {
        label,
        href: submissionId ? `${baseHref}&submissionId=${submissionId}` : baseHref,
        projectFormId,
      };
    },
    [detail.id, formEntries],
  );

  const [rawCompositeNameById, setRawCompositeNameById] = React.useState<Map<number, string>>(new Map());
  const compositeNameById = React.useMemo(
    () => (compositeRows.length === 0 ? new Map<number, string>() : rawCompositeNameById),
    [compositeRows.length, rawCompositeNameById],
  );

  React.useEffect(() => {
    if (compositeRows.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchItemsPage(1, 500, { isActive: true });
        if (cancelled) return;
        const map = new Map<number, string>();
        for (const item of items) {
          map.set(item.id, item.name?.trim() || item.sku?.trim() || "—");
        }
        setRawCompositeNameById(map);
      } catch {
        if (!cancelled) setRawCompositeNameById(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compositeRows.length]);

  function compositeItemId(row: (typeof compositeRows)[number]): number | null {
    return resolveJobMetaCompositeItemId(row);
  }

  const clientId = detail.client && typeof detail.client === "object" ? detail.client.id : typeof detail.client === "number" ? detail.client : null;
  const projectId =
    detail.project && typeof detail.project === "object" ? detail.project.id : typeof detail.project === "number" ? detail.project : null;
  const siteId = detail.site && typeof detail.site === "object" ? detail.site.id : typeof detail.site === "number" ? detail.site : null;

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("sections.basic")}>
          <DetailMetricsGrid>
            <DetailMetricCard label={t("fields.jobStatus")}>
              <WorkflowColourStatusChip
                row={statusRow}
                fallbackLabel={detail.job_pin_status?.trim() || t("detail.statusUnknown")}
              />
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.assignedWorker")}>
              {workerLabel ?? jobAssignedWorkerLabel(detail)}
            </DetailMetricCard>
            {/* <DetailMetricCard label={t("fields.jobId")}>
              <span className="tabular-nums">{detail.id}</span>
            </DetailMetricCard> */}
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionRelations")}>
          <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-3">
            <DetailMetricCard label={t("fields.client")}>
              {clientId != null ? (
                <DetailEntityLink
                  href={`${routes.dashboard.clients}/${clientId}`}
                  className="font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {jobClientLabel(detail.client)}
                </DetailEntityLink>
              ) : (
                "—"
              )}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.project")}>
              {projectId != null ? (
                <DetailEntityLink
                  href={`${routes.dashboard.projects}/${projectId}`}
                  className="font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {jobProjectLabel(detail.project)}
                </DetailEntityLink>
              ) : (
                "—"
              )}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.site")}>
              {siteId != null ? (
                <DetailEntityLink
                  href={`${routes.dashboard.sites}/${siteId}`}
                  className="font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {jobSiteLabel(detail.site)}
                </DetailEntityLink>
              ) : (
                "—"
              )}
            </DetailMetricCard>
          </DetailMetricsGrid>
          <JobFormsSection
            jobId={detail.id}
            forms={formEntries}
            checklists={checklistEntries}
            checklistMarked={checklistMarked}
            backHref={`${routes.dashboard.jobs}/${detail.id}`}
            onChecklistsUpdated={onChecklistsUpdated}
          />
        </DetailPanelCard>

        <JobChecklistsSection checklists={checklistEntries} />

        {meta && (meta.total != null || compositeRows.length > 0) ? (
          <DetailPanelCard title={t("detail.sectionWorkScope")}>
           
            {compositeRows.length > 0 ? (
              <div className="mt-3">
                <DetailLinkedTable
                  columns={[
                    { id: "name", header: t("detail.colCompositeItem"), widthClass: "w-[34%]" },
                    { id: "qty", header: t("fields.compositeQuantity"), narrow: true, align: "right", widthClass: "w-[14%]" },
                    // { id: "unit", header: t("detail.colUnitPrice"), narrow: true, align: "right", widthClass: "w-[18%]" },
                    // { id: "line", header: t("detail.colLineTotal"), narrow: true, align: "right", widthClass: "w-[18%]" },
                  ]}
                >
                  {compositeRows.map((row, index) => {
                    // const unit =
                    //   row.amount != null &&
                    //   Number.isFinite(row.amount) &&
                    //   row.quantity > 0
                    //     ? row.amount / row.quantity
                    //     : typeof row.selling_price === "number" && Number.isFinite(row.selling_price)
                    //       ? row.selling_price
                    //       : row.item &&
                    //           typeof row.item === "object" &&
                    //           typeof row.item.selling_price === "number" &&
                    //           Number.isFinite(row.item.selling_price)
                    //         ? row.item.selling_price
                    //         : 0;
                    // const lineTotal =
                    //   row.amount != null && Number.isFinite(row.amount)
                    //     ? row.amount
                    //     : unit > 0
                    //       ? unit * row.quantity
                    //       : 0;
                    const itemId = compositeItemId(row);
                    const name =
                      row.name?.trim() ||
                      (row.item && typeof row.item === "object" && row.item.name?.trim()) ||
                      (itemId != null ? compositeNameById.get(itemId) : undefined) ||
                      "—";
                    return (
                      <DetailLinkedTableRow key={`${itemId ?? "row"}-${index}`} index={index}>
                        <DetailLinkedTableTd
                          className={detailLinkedTableCellClassName({
                            cellClassName: "font-medium text-slate-900 dark:text-slate-100",
                          })}
                        >
                          {itemId != null ? (
                            <DetailEntityLink
                              href={`${routes.dashboard.items}/${itemId}`}
                              className="text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                            >
                              {name}
                            </DetailEntityLink>
                          ) : (
                            name
                          )}
                        </DetailLinkedTableTd>
                        <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                        >
                          {row.quantity}
                        </DetailLinkedTableTd>
                        {/* <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                        >
                          {unit > 0 ? formatMoneyDisplay(unit, loc) : "—"}
                        </DetailLinkedTableTd>
                        <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({
                            align: "right",
                            narrow: true,
                            cellClassName: "tabular-nums font-medium",
                          })}
                        >
                          {lineTotal > 0 ? formatMoneyDisplay(lineTotal, loc) : "—"}
                        </DetailLinkedTableTd> */}
                      </DetailLinkedTableRow>
                    );
                  })}
                </DetailLinkedTable>
              </div>
            ) : null}
          </DetailPanelCard>
        ) : null}

        {detail.qr_code?.qr_image ? (
          <DetailPanelCard title={t("detail.sectionQrCode")}>
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detail.qr_code.qr_image}
                alt={detail.qr_code.qr_code_id ?? t("detail.sectionQrCode")}
                className="size-40 rounded-lg border border-slate-200 bg-white object-contain p-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </DetailPanelCard>
        ) : null}

        <DetailPanelCard title={t("detail.sectionSchedule")}>
          <DetailMetricsGrid>
            <DetailMetricCard label={t("fields.startDate")}>
              {formatFlexibleApiDate(detail.start_date, dateFmt)}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.endDate")}>
              {detail.completed_at
                ? formatFlexibleApiDate(detail.completed_at, dateFmt)
                : t("detail.notCompleted")}
            </DetailMetricCard>
            {detail.job_pin_status ? (
              <DetailMetricCard label={t("fields.pinStatus")}>
                <span className="capitalize">{detail.job_pin_status}</span>
              </DetailMetricCard>
            ) : null}
          </DetailMetricsGrid>
        </DetailPanelCard>

        {detail.description?.trim() ? (
          <DetailPanelCard title={t("detail.sectionDescription")}>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{detail.description}</p>
          </DetailPanelCard>
        ) : null}

        {levels.length > 0 && (
          <DetailPanelCard title={locale === "es" ? "Planos y Pins" : "Drawings & Pins"}>
            <div className="space-y-8 mt-3">
              {levels.map((level) => {
                const plots = level.plots ?? [] as JobDrawingPlot[];
                return (
                  <section key={level.id} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-1 rounded-full bg-[color:var(--dash-accent,#f97316)]"
                        aria-hidden
                      />
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                        {level.name}
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {plots.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 pl-4">
                          No plots in this level.
                        </p>
                      ) : (
                        plots.map((plot: JobDrawingPlot) => (
                          <PlotPinsBlock
                            key={`${level.id}-${plot.id}`}
                            plotName={plot.name}
                            pins={plot.pins ?? []}
                            onPreviewPin={(pin) => {
                              setPreviewPinData({
                                pin,
                                plots: [plot as DrawingPlot],
                                drawingFile: level.drawing_file,
                                drawingName: level.name,
                              });
                            }}
                            getPinForm={getPinForm}
                          />
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </DetailPanelCard>
        )}

        <DetailSystemMetadataSection
          createdAt={detail.created_at}
          modifiedAt={detail.modified_at}
          dateFmt={dateFmt}
          createdBy={detail.created_by}
          modifiedBy={detail.modified_by}
          labels={{
            sectionTitle: tMeta("systemMetadata"),
            createdAt: t("fields.createdAt"),
            updatedAt: t("fields.updatedAt"),
            createdBy: t("fields.createdBy"),
            modifiedBy: tMeta("modifiedBy"),
            notModifiedYet: tMeta("notModifiedYet"),
          }}
        />
      </div>
      {previewPinData && (
        <DrawingPinPreviewModal
          open={previewPinData !== null}
          onClose={() => setPreviewPinData(null)}
          pin={previewPinData.pin}
          plots={previewPinData.plots}
          drawingFile={previewPinData.drawingFile}
          drawingName={previewPinData.drawingName}
        />
      )}
    </DetailPagePadding>
  );
}
