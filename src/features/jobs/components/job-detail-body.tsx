"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Job } from "@/features/jobs/types/job.types";
import { JobFormsSection } from "@/features/job-forms/components/job-forms-section";
import { usePathname, useRouter } from "@/i18n/navigation";
import { JobFormChecklistGateModal } from "@/features/job-forms/components/job-form-checklist-gate-modal";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import { updateJob, updateJobChecklists } from "@/features/jobs/api/job.api";
import {
  jobChecklistUpdatePayload,
  requiredJobChecklistsComplete,
} from "@/features/jobs/utils/job-nested-fields.util";
import { toastApiError, toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { fetchPinStatusesPage } from "@/features/pin-status/api/pin-status.api";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import type { JobChecklistItem } from "@/features/jobs/types/job.types";
import { JobChecklistsSection } from "@/features/jobs/components/job-checklists-section";
import {
  getJobStatusId,
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
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
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
import {
  formatApiDateForHtmlDateInput,
  formatFlexibleApiDate,
} from "@/shared/utils/api-date-parse.util";
import { cn } from "@/core/utils/http.util";
import { CalendarDays, ChevronRight, Layers, MapPinned } from "lucide-react";
import { DrawingPinPreviewModal } from "@/features/projects/components/drawing-pin-preview-modal";
import { JobQualityAssuranceControls } from "@/features/jobs/components/job-quality-assurance-controls";
import { QualityAssuranceDetailGrid } from "@/features/jobs/components/quality-assurance-status";
import { isQualityAssuranceDecided } from "@/features/jobs/types/quality-assurance.types";
import { isPinEligibleForQualityAssurance } from "@/features/jobs/utils/quality-assurance-eligibility.util";
import { resolvePinFormMeta } from "@/features/projects/utils/pin-form-meta.util";
import type { Drawing, DrawingPin, DrawingPlot } from "@/features/projects/types/drawing.types";
import { useLevelSnapshots, type LevelSnapshotState } from "@/shared/hooks/use-level-snapshots.hook";
import { PinThumbnailCropped } from "@/shared/components/pin-thumbnail-cropped";
import { DrawingFilePreviewFill } from "@/features/projects/components/drawing-file-preview";
import { DrawingPinThumbnailOverlay } from "@/features/projects/components/drawing-pin-thumbnail-overlay";
import { useSearchParams } from "next/navigation";

type JobDrawingPlot = Omit<DrawingPlot, "coordinates"> & {
  coordinates?: number[][];
  pins?: DrawingPin[];
};

type JobDrawingLevel = {
  id: number;
  name: string;
  drawing_file: string;
  drawing_file_type?: string;
  plots?: JobDrawingPlot[];
};

const PIN_TABLE_GRID =
  "grid min-w-0 w-full max-w-full grid-cols-[minmax(0,1.75rem)_minmax(0,3.5rem)_minmax(0,1.1fr)_minmax(0,5rem)_minmax(0,0.45fr)_minmax(0,0.35fr)_minmax(0,0.75fr)_minmax(0,0.45fr)] items-center gap-x-3 sm:gap-x-4";

const PIN_TABLE_HEADER_CLASS = cn(
  PIN_TABLE_GRID,
  "border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
);

const PIN_TABLE_ROW_CLASS = cn(
  PIN_TABLE_GRID,
  "px-4 py-3 text-sm transition-colors border-b border-slate-100 last:border-b-0 dark:border-slate-800/80",
);

const pinCheckboxClassName = cn(
  "size-4 shrink-0 rounded border-slate-300 text-[color:var(--dash-accent,#0f172a)]",
  "focus:ring-[color:var(--dash-accent,#0f172a)] dark:border-slate-600",
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

function ProjectPinTableHeader({
  allSelectableSelected,
  someSelectableSelected,
  hasSelectable,
  onToggleSelectAll,
}: {
  allSelectableSelected: boolean;
  someSelectableSelected: boolean;
  hasSelectable: boolean;
  onToggleSelectAll: () => void;
}) {
  const locale = useLocale();
  const isEs = locale === "es";
  const tQa = useTranslations("Dashboard.jobs.qualityAssurance");
  const selectAllRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelectableSelected && !allSelectableSelected;
    }
  }, [someSelectableSelected, allSelectableSelected]);

  return (
    <div className={PIN_TABLE_HEADER_CLASS}>
      <span className="flex items-center justify-center">
        <input
          ref={selectAllRef}
          type="checkbox"
          className={pinCheckboxClassName}
          checked={allSelectableSelected && hasSelectable}
          disabled={!hasSelectable}
          onChange={onToggleSelectAll}
          aria-label={tQa("selectAll")}
          title={tQa("selectAll")}
        />
      </span>
      <span>Pin ID</span>
      <span>Product</span>
      <span>Preview</span>
      <span>{isEs ? "Variación" : "Variation"}</span>
      <span>Quantity</span>
      <span>Form</span>
      <span>Status</span>
    </div>
  );
}

function ProjectPinRow({
  pin,
  form,
  onPreview,
  onOpenDetail,
  checklistsComplete,
  checklistMarked,
  onOpenGateModal,
  onNavigate,
  pinStatuses,
  onUpdatePinStatus,
  drawingFile,
  drawingFileType,
  snapshotState,
  plots,
  drawingName,
  selected,
  selectable,
  onToggleSelected,
}: {
  pin: DrawingPin;
  form?: { label: string; href: string; projectFormId: number; submitted: boolean } | null;
  onPreview: () => void;
  onOpenDetail: () => void;
  checklistsComplete: boolean;
  checklistMarked: boolean;
  onOpenGateModal: (href: string, label: string) => void;
  onNavigate: (href: string) => void;
  pinStatuses: WorkflowColourStatus[];
  onUpdatePinStatus: (pinId: number, nextStatusId: number) => void;
  drawingFile?: string;
  drawingFileType?: string;
  snapshotState?: LevelSnapshotState;
  plots: DrawingPlot[];
  drawingName?: string;
  selected: boolean;
  selectable: boolean;
  onToggleSelected: (pinId: number) => void;
}) {
  const locale = useLocale();
  const isEs = locale === "es";
  const productName = pin.item_detail?.name || pin.group_detail?.name || "Pin";
  const sku = pin.item_detail?.sku;
  const variationText = pin.variation ? (isEs ? "Sí" : "Yes") : (isEs ? "No" : "No");
  const t = useTranslations("Dashboard.jobs.forms");

  const [isEditingStatus, setIsEditingStatus] = React.useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className={cn(PIN_TABLE_ROW_CLASS, "cursor-pointer bg-white dark:bg-slate-950 dark:hover:bg-slate-900/80")}
    >
      <span
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {selectable ? (
          <input
            type="checkbox"
            className={pinCheckboxClassName}
            checked={selected}
            onChange={() => onToggleSelected(pin.id)}
            aria-label={`Select pin #${pin.id}`}
          />
        ) : (
          <span className="size-4" aria-hidden />
        )}
      </span>
      <span className="font-semibold text-slate-500">#{pin.id}</span>
      <div className="flex flex-col min-w-0 pl-4">
        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{productName}</span>
        {sku && <span className="text-xs text-slate-400 truncate">{sku}</span>}
      </div>

      {/* Preview thumbnail */}
      <div className="flex items-center justify-start">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          title={drawingName ? `Preview on ${drawingName}` : "Preview on Drawing"}
          aria-label={`Preview pin #${pin.id} on drawing`}
          className="relative h-9 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
        >
          {snapshotState?.status === "ready" && snapshotState.snapshot ? (
            <PinThumbnailCropped
              snapshotUrl={snapshotState.snapshot.objectUrl}
              snapshotWidth={snapshotState.snapshot.width}
              snapshotHeight={snapshotState.snapshot.height}
              xPercent={pin.x_coordinate}
              yPercent={pin.y_coordinate}
              pinColor={pin.status_detail?.bg_colour || "#10b981"}
              className="absolute inset-0"
              alt=""
            />
          ) : snapshotState?.status === "loading" ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : drawingFile && plots.length > 0 ? (
            <span className="absolute inset-0">
              <div
                className="absolute inset-0"
                style={{
                  transformOrigin: `${pin.x_coordinate}% ${pin.y_coordinate}%`,
                  transform: `translate(${50 - pin.x_coordinate}%, ${50 - pin.y_coordinate}%) scale(3)`,
                }}
              >
                <DrawingFilePreviewFill
                  drawingFile={drawingFile}
                  fileType={drawingFileType}
                  alt=""
                  className="size-full"
                />
                <DrawingPinThumbnailOverlay
                  plots={plots}
                  activePinId={pin.id}
                />
              </div>
            </span>
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
              Preview
            </span>
          )}
          <span className="sr-only">Preview</span>
        </button>
      </div>

      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
        {variationText}
      </span>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{pin.quantity ?? 1}</span>
      <div className="min-w-0">
        {form ? (
          <button
            type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (form.submitted || checklistsComplete) {
              onNavigate(form.href);
            } else {
              onOpenGateModal(form.href, form.label);
            }
          }}
            className={cn(
              "inline-flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-full border px-2.5 py-1 text-xs font-semibold transition text-left",
              !form.submitted && !checklistsComplete
                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-pointer dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[color:var(--dash-accent)] hover:text-[color:var(--dash-accent)] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
            )}
          >
            <span className="truncate">{form.label}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              #{form.projectFormId}
            </span>
            <span className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              form.submitted
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : !checklistsComplete
                  ? "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            )}
            >
              {form.submitted ? t("statusSubmitted") : t("statusPending")}
            </span>
          </button>
        ) : (
          <span className="text-xs text-slate-500">{locale === "es" ? "Agregar formulario" : "Add a form"}</span>
        )}
      </div>
      <div>
        {isEditingStatus && pinStatuses.length > 0 ? (
          <select
            autoFocus
            value={pin.status ?? pin.status_detail?.id ?? ""}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => setIsEditingStatus(false)}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                onUpdatePinStatus(pin.id, Number(val));
                setIsEditingStatus(false);
              }
            }}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-[color:var(--dash-accent)] focus:ring-1 focus:ring-[color:var(--dash-accent)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="" disabled>
              Select status...
            </option>
            {pinStatuses.map((st) => (
              <option key={st.id} value={st.id}>
                {st.status_name}
              </option>
            ))}
          </select>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => {
              if (!checklistMarked) {
                toastError(
                  locale === "es"
                    ? "Las listas de verificación deben estar marcadas antes de actualizar el estado."
                    : "Checklists must be marked complete before changing status."
                );
                return;
              }
              if (!form) {
                toastError(locale === "es" ? "Agregar un formulario antes de cambiar el estado." : "Add a form before changing status.");
                return;
              }
              if (!form.submitted) {
                toastError(locale === "es" ? "El formulario no está enviado. No se puede cambiar el estado." : "Form not submitted. Submit the form before changing status.");
                return;
              }
              setIsEditingStatus(true);
            }}
            className="cursor-pointer select-none"
            title={
              checklistMarked
                ? (locale === "es" ? "Doble clic para editar estado" : "Double click to edit status")
                : (locale === "es" ? "Las listas de verificación deben marcarse primero" : "Checklists must be marked complete first")
            }
          >
            <PinStatusChip pin={pin} />
          </div>
        )}
      </div>
    </div>
  );
}

type PinCategory = {
  id: string;
  item_name: string;
  pins: DrawingPin[];
};

function PlotPinCategoryGroup({
  category,
  expanded,
  onToggleExpanded,
  onPreviewPin,
  onOpenPinDetail,
  getPinForm,
  checklistsComplete,
  checklistMarked,
  onOpenGateModal,
  onNavigate,
  pinStatuses,
  onUpdatePinStatus,
  drawingFile,
  drawingFileType,
  snapshotState,
  drawingName,
  plot,
  selectedPinIds,
  onTogglePinSelected,
}: {
  category: PinCategory;
  expanded: boolean;
  onToggleExpanded: () => void;
  onPreviewPin: (pin: DrawingPin) => void;
  onOpenPinDetail: (pin: DrawingPin) => void;
  getPinForm: (pin: DrawingPin) => { label: string; href: string; projectFormId: number; submitted: boolean } | null;
  checklistsComplete: boolean;
  checklistMarked: boolean;
  onOpenGateModal: (href: string, label: string) => void;
  onNavigate: (href: string) => void;
  pinStatuses: WorkflowColourStatus[];
  onUpdatePinStatus: (pinId: number, nextStatusId: number) => void;
  drawingFile?: string;
  drawingFileType?: string;
  snapshotState?: LevelSnapshotState;
  drawingName?: string;
  plot: JobDrawingPlot;
  selectedPinIds: Set<number>;
  onTogglePinSelected: (pinId: number) => void;
}) {
  return (
    <div className="rounded-b-xl border-t border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
      >
        <div className="inline-flex items-center gap-2">
          <ChevronRight
            className={cn("h-3 w-3 transition-transform duration-200", expanded && "rotate-90")}
          />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{category.item_name}</span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {category.pins.length} {category.pins.length === 1 ? "Pin" : "Pins"}
        </span>
      </button>
      {expanded && (
        <div className="space-y-0">
          {category.pins.map((pin) => {
            const selectable =
              isPinEligibleForQualityAssurance(pin) &&
              !isQualityAssuranceDecided(pin.quality_assurance);
            return (
              <ProjectPinRow
                key={pin.id}
                pin={pin}
                form={getPinForm(pin)}
                onPreview={() => onPreviewPin(pin)}
                onOpenDetail={() => onOpenPinDetail(pin)}
                checklistsComplete={checklistsComplete}
                checklistMarked={checklistMarked}
                onOpenGateModal={onOpenGateModal}
                onNavigate={onNavigate}
                pinStatuses={pinStatuses}
                onUpdatePinStatus={onUpdatePinStatus}
                drawingFile={drawingFile}
                drawingFileType={drawingFileType}
                snapshotState={snapshotState}
                plots={[plot as DrawingPlot]}
                drawingName={drawingName}
                selected={selectedPinIds.has(pin.id)}
                selectable={selectable}
                onToggleSelected={onTogglePinSelected}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlotPinsBlock({
  plot,
  plotName,
  pins,
  onPreviewPin,
  onOpenPinDetail,
  getPinForm,
  checklistsComplete,
  checklistMarked,
  onOpenGateModal,
  onNavigate,
  pinStatuses,
  onUpdatePinStatus,
  drawingFile,
  drawingFileType,
  snapshotState,
  drawingName,
  selectedPinIds,
  onTogglePinSelected,
  onToggleSelectAllInPlot,
}: {
  plot: JobDrawingPlot;
  plotName: string;
  pins: DrawingPin[];
  onPreviewPin: (pin: DrawingPin) => void;
  onOpenPinDetail: (pin: DrawingPin) => void;
  getPinForm: (pin: DrawingPin) => { label: string; href: string; projectFormId: number; submitted: boolean } | null;
  checklistsComplete: boolean;
  checklistMarked: boolean;
  onOpenGateModal: (href: string, label: string) => void;
  onNavigate: (href: string) => void;
  pinStatuses: WorkflowColourStatus[];
  onUpdatePinStatus: (pinId: number, nextStatusId: number) => void;
  drawingFile?: string;
  drawingFileType?: string;
  snapshotState?: LevelSnapshotState;
  drawingName?: string;
  selectedPinIds: Set<number>;
  onTogglePinSelected: (pinId: number) => void;
  onToggleSelectAllInPlot: (pinIds: number[]) => void;
}) {
  const categorizedPins = React.useMemo(() => {
    return pins.reduce((acc: PinCategory[], currentPin) => {
      const categoryId = String(
        currentPin?.item_detail?.id ?? currentPin?.group_detail?.id ?? "uncategorized",
      );
      const existing = acc.find((cat) => cat.id === categoryId);
      const itemName =
        currentPin?.item_detail?.name ?? currentPin?.group_detail?.name ?? "Uncategorized";
      if (existing) {
        existing.pins.push(currentPin);
      } else {
        acc.push({ id: categoryId, item_name: itemName, pins: [currentPin] });
      }
      return acc;
    }, []);
  }, [pins]);

  const [expandedCategoryIds, setExpandedCategoryIds] = React.useState<Set<string>>(() =>
    new Set(categorizedPins.map((category) => category.id)),
  );

  const toggleCategoryExpanded = React.useCallback((categoryId: string) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  React.useEffect(() => {
    setExpandedCategoryIds(new Set(categorizedPins.map((category) => category.id)));
  }, [categorizedPins]);

  const selectableIds = React.useMemo(
    () =>
      pins
        .filter(
          (p) =>
            isPinEligibleForQualityAssurance(p) &&
            !isQualityAssuranceDecided(p.quality_assurance),
        )
        .map((p) => p.id),
    [pins],
  );
  const allSelectableSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedPinIds.has(id));
  const someSelectableSelected =
    selectableIds.some((id) => selectedPinIds.has(id)) && !allSelectableSelected;

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
            <ProjectPinTableHeader
              allSelectableSelected={allSelectableSelected}
              someSelectableSelected={someSelectableSelected}
              hasSelectable={selectableIds.length > 0}
              onToggleSelectAll={() => onToggleSelectAllInPlot(selectableIds)}
            />
            {categorizedPins.map((category) => (
              <PlotPinCategoryGroup
                key={category.id}
                category={category}
                expanded={expandedCategoryIds.has(category.id)}
                onToggleExpanded={() => toggleCategoryExpanded(category.id)}
                onPreviewPin={onPreviewPin}
                onOpenPinDetail={onOpenPinDetail}
                getPinForm={getPinForm}
                checklistsComplete={checklistsComplete}
                checklistMarked={checklistMarked}
                onOpenGateModal={onOpenGateModal}
                onNavigate={onNavigate}
                pinStatuses={pinStatuses}
                onUpdatePinStatus={onUpdatePinStatus}
                drawingFile={drawingFile}
                drawingFileType={drawingFileType}
                snapshotState={snapshotState}
                drawingName={drawingName}
                plot={plot}
                selectedPinIds={selectedPinIds}
                onTogglePinSelected={onTogglePinSelected}
              />
            ))}
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
  onSaved,
  onOpenScheduling,
}: {
  detail: Job;
  dateFmt: Intl.DateTimeFormat;
  workerLabel?: string;
  onChecklistsUpdated?: () => void;
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
  onOpenScheduling?: () => void;
}) {
  const t = useTranslations("Dashboard.jobs");
  const tQa = useTranslations("Dashboard.jobs.qualityAssurance");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [gateOpen, setGateOpen] = React.useState(false);
  const [gateSaving, setGateSaving] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const [pendingFormLabel, setPendingFormLabel] = React.useState("");

  const [pinStatuses, setPinStatuses] = React.useState<WorkflowColourStatus[]>([]);
  const [jobStatuses, setJobStatuses] = React.useState<WorkflowColourStatus[]>([]);

  React.useEffect(() => {
    fetchPinStatusesPage(1, 500, { is_active: true })
      .then((res) => setPinStatuses(res.items))
      .catch((err) => console.error("Failed to load pin statuses", err));
  }, []);

  React.useEffect(() => {
    fetchJobStatusesPage(1, 500)
      .then((res) => setJobStatuses(res.items.filter((s) => s.is_active !== false)))
      .catch((err) => console.error("Failed to load job statuses", err));
  }, []);

  const jobStatusSelectOptions = React.useMemo(
    () => jobStatuses.map((s) => ({ value: String(s.id), label: s.status_name })),
    [jobStatuses],
  );

  const [previewPinData, setPreviewPinData] = React.useState<{
    pin: DrawingPin;
    plots: DrawingPlot[];
    drawingFile: string;
    drawingName: string;
    form: { label: string; href: string; projectFormId: number; submitted: boolean } | null;
  } | null>(null);

  const levels = React.useMemo(() => {
    const typedDetail = detail as unknown as { levels?: JobDrawingLevel[]; level?: JobDrawingLevel | JobDrawingLevel[] };
    const rawLevels = typedDetail.levels ?? typedDetail.level;
    if (!rawLevels) return [];
    return Array.isArray(rawLevels) ? rawLevels : [rawLevels];
  }, [detail]);

  const allJobPins = React.useMemo(() => {
    const pins: DrawingPin[] = [];
    for (const level of levels) {
      for (const plot of level.plots ?? []) {
        for (const pin of plot.pins ?? []) pins.push(pin);
      }
    }
    return pins;
  }, [levels]);

  const pendingQaPinIds = React.useMemo(
    () =>
      allJobPins
        .filter(
          (pin) =>
            isPinEligibleForQualityAssurance(pin) &&
            !isQualityAssuranceDecided(pin.quality_assurance),
        )
        .map((pin) => pin.id),
    [allJobPins],
  );

  const [selectedPinIds, setSelectedPinIds] = React.useState<Set<number>>(() => new Set());

  React.useEffect(() => {
    setSelectedPinIds((prev) => {
      const pending = new Set(pendingQaPinIds);
      const next = new Set<number>();
      for (const id of prev) {
        if (pending.has(id)) next.add(id);
      }
      return next;
    });
  }, [pendingQaPinIds]);

  const togglePinSelected = React.useCallback((pinId: number) => {
    setSelectedPinIds((prev) => {
      const next = new Set(prev);
      if (next.has(pinId)) next.delete(pinId);
      else next.add(pinId);
      return next;
    });
  }, []);

  const toggleSelectAllInPlot = React.useCallback((pinIds: number[]) => {
    setSelectedPinIds((prev) => {
      const next = new Set(prev);
      const allSelected = pinIds.length > 0 && pinIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of pinIds) next.delete(id);
      } else {
        for (const id of pinIds) next.add(id);
      }
      return next;
    });
  }, []);

  const selectedPinIdList = React.useMemo(() => [...selectedPinIds], [selectedPinIds]);

  const levelsAsDrawings = React.useMemo(
    () =>
      levels.map(
        (l) =>
          ({
            id: l.id,
            name: l.name,
            drawing_file: l.drawing_file,
            drawing_file_type: l.drawing_file_type ?? "",
          }) as unknown as Drawing,
      ),
    [levels],
  );
  const levelSnapshots = useLevelSnapshots(levelsAsDrawings);

  const statusRow = getJobStatusRow(detail);
  const meta = normalizeJobMeta(detail.job_meta);
  const compositeRows = meta?.composite_items ?? [];
  const formEntries = jobFormEntries(detail);
  const checklistEntries = jobChecklistEntries(detail);
  const checklistMarked = jobChecklistIsMarked(detail);

  const checklistsComplete = requiredJobChecklistsComplete(checklistEntries, { isMarked: checklistMarked });

  async function patchField(body: Parameters<typeof updateJob>[1]) {
    try {
      await updateJob(detail.id, body);
      toastSuccess(t("updatedToast"));
      onSaved?.();
    } catch (error) {
      toastApiError(error, t("updateError"));
      throw error;
    }
  }

  async function handleGateConfirm(items: JobChecklistItem[]) {
    setGateSaving(true);
    try {
      await updateJobChecklists(detail.id, jobChecklistUpdatePayload(items));
      onChecklistsUpdated?.();
      setGateOpen(false);
      if (pendingHref) {
        router.push(pendingHref);
        setPendingHref(null);
      }
    } catch (error) {
      toastApiError(error, "Failed to update checklists");
    } finally {
      setGateSaving(false);
    }
  }

  async function handleUpdatePinStatus(pinId: number, nextStatusId: number) {
    if (!checklistMarked) {
      toastError(
        locale === "es"
          ? "Las listas de verificación deben estar marcadas antes de actualizar el estado."
          : "Checklists must be marked complete before changing status."
      );
      return;
    }
    // Find the pin object so we can inspect its form/submission status
    let foundPin: DrawingPin | null = null;
    for (const lvl of levels) {
      const plots = (lvl.plots ?? []) as JobDrawingPlot[];
      for (const p of plots) {
        for (const pin of p.pins ?? []) {
          if (pin.id === pinId) {
            foundPin = pin;
            break;
          }
        }
        if (foundPin) break;
      }
      if (foundPin) break;
    }

    const pinForm = foundPin ? getPinForm(foundPin) : null;
    if (!pinForm) {
      toastError(locale === "es" ? "Agregar un formulario antes de cambiar el estado." : "Add a form before changing status.");
      return;
    }
    if (!pinForm.submitted) {
      toastError(locale === "es" ? "El formulario no está enviado. No se puede cambiar el estado." : "Form not submitted. Submit the form before changing status.");
      return;
    }
    // Send only the changed pin to the API: [{ id, status }]
    const pinsPayload: Array<{ id: number; status: number | null }> = [
      { id: pinId, status: nextStatusId },
    ];

    try {
      await updateJob(detail.id, { pins: pinsPayload });
      onChecklistsUpdated?.();
    } catch (err) {
      toastApiError(err, "Failed to update pin status");
    }
  }

  const getPinForm = React.useCallback(
    (pin: DrawingPin) => {
      const meta = resolvePinFormMeta(pin, { formEntries });
      if (!meta) return null;

      const baseHref = `${routes.dashboard.jobFormFill(detail.id, meta.projectFormId, meta.jobFormId)}&name=${encodeURIComponent(
        meta.label,
      )}&back=${encodeURIComponent(`${routes.dashboard.jobs}/${detail.id}`)}&job_pin_id=${Number(pin.job_pin_id)}`;

      return {
        label: meta.label,
        href: meta.submitted && meta.submissionId ? `${baseHref}&submission_id=${meta.submissionId}` : baseHref,
        projectFormId: meta.projectFormId,
        submitted: meta.submitted,
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
  const isServiceJob =
    (detail.job_category ?? searchParams.get("job_category") ?? "")
      .toLowerCase()
      .replace(/[^a-z]/g, "") === "servicejob";

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("sections.basic")}>
          <DetailMetricsGrid columns={2}>
            {jobStatusSelectOptions.length > 0 ? (
              <DetailEditableField
                label={t("fields.jobStatus")}
                value={getJobStatusId(detail) != null ? String(getJobStatusId(detail)) : ""}
                kind="select"
                options={jobStatusSelectOptions}
                editAriaLabel={tActions("edit")}
                onSave={(next) => patchField({ job_status: Number(next) })}
              >
                <WorkflowColourStatusChip
                  row={statusRow}
                  fallbackLabel={detail.job_pin_status?.trim() || t("detail.statusUnknown")}
                />
              </DetailEditableField>
            ) : (
              <DetailMetricCard label={t("fields.jobStatus")}>
                <WorkflowColourStatusChip
                  row={statusRow}
                  fallbackLabel={detail.job_pin_status?.trim() || t("detail.statusUnknown")}
                />
              </DetailMetricCard>
            )}
            <DetailMetricCard label={t("fields.assignedWorker")}>
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 truncate">{workerLabel ?? jobAssignedWorkerLabel(detail)}</span>
                {onOpenScheduling ? (
                  <button
                    type="button"
                    title={t("detail.openScheduling")}
                    aria-label={t("detail.openScheduling")}
                    onClick={onOpenScheduling}
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition",
                      "hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-300",
                    )}
                  >
                    <CalendarDays className="size-4" strokeWidth={1.75} aria-hidden />
                  </button>
                ) : null}
              </div>
            </DetailMetricCard>
          </DetailMetricsGrid>
        </DetailPanelCard>

        {isQualityAssuranceDecided(detail.job_quality_assurance) && detail.job_quality_assurance ? (
          <DetailPanelCard title={t("qualityAssurance.sectionTitle")} collapsible={false}>
            <QualityAssuranceDetailGrid record={detail.job_quality_assurance} dateFmt={dateFmt} />
          </DetailPanelCard>
        ) : null}

        <DetailPanelCard title={t("detail.sectionRelations")}>
          <DetailMetricsGrid columns={2}>
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
            {!isServiceJob ? (
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
            ) : null}
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

        <JobChecklistsSection
          checklists={checklistEntries}
          onCompleteChecks={checklistMarked ? undefined : () => {
            setPendingHref(null);
            setPendingFormLabel("Job Verification Checks");
            setGateOpen(true);
          }}
        />

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
            <DetailMetricCard label={t("fields.jobTime")}>
              {detail.job_time?.trim() ? detail.job_time.trim() : "—"}
            </DetailMetricCard>
            <DetailEditableField
              label={t("fields.startDate")}
              value={formatApiDateForHtmlDateInput(detail.start_date)}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ start_date: next })}
            >
              {formatFlexibleApiDate(detail.start_date, dateFmt)}
            </DetailEditableField>
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

        <DetailPanelCard title={t("detail.sectionDescription")}>
          <DetailEditableField
            label={t("fields.description")}
            value={detail.description?.trim() ?? ""}
            kind="text"
            editAriaLabel={tActions("edit")}
            empty="—"
            onSave={(next) => patchField({ description: next })}
          >
            {detail.description?.trim() ? (
              <p className="whitespace-pre-wrap text-sm font-normal text-slate-700 dark:text-slate-300">
                {detail.description}
              </p>
            ) : null}
          </DetailEditableField>
        </DetailPanelCard>

        {levels.length > 0 && (
          <DetailPanelCard
            title={locale === "es" ? "Planos y Pins" : "Drawings & Pins"}
          >
            {selectedPinIdList.length > 0 ? (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {tQa("selectedCount", { count: selectedPinIdList.length })}
                </span>
                <JobQualityAssuranceControls
                  jobId={detail.id}
                  pinIds={selectedPinIdList}
                  onSuccess={() => {
                    setSelectedPinIds(new Set());
                    onChecklistsUpdated?.();
                  }}
                />
              </div>
            ) : null}
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
                            plot={plot}
                            plotName={plot.name}
                            pins={plot.pins ?? []}
                            onPreviewPin={(pin) => {
                              setPreviewPinData({
                                pin,
                                plots: [plot as DrawingPlot],
                                drawingFile: level.drawing_file,
                                drawingName: level.name,
                                form: getPinForm(pin),
                              });
                            }}
                            onOpenPinDetail={(pin) => {
                              router.push(
                                `${routes.dashboard.jobPinDetail(detail.id, pin.id)}?back=${encodeURIComponent(
                                  `${routes.dashboard.jobs}/${detail.id}`,
                                )}`,
                              );
                            }}
                            getPinForm={getPinForm}
                            checklistsComplete={checklistsComplete}
                            checklistMarked={checklistMarked}
                            onOpenGateModal={(href, label) => {
                              setPendingHref(href);
                              setPendingFormLabel(label);
                              setGateOpen(true);
                            }}
                            onNavigate={(href) => router.push(href)}
                            pinStatuses={pinStatuses}
                            onUpdatePinStatus={handleUpdatePinStatus}
                            drawingFile={level.drawing_file}
                            drawingFileType={level.drawing_file_type}
                            snapshotState={levelSnapshots.get(level.id)}
                            drawingName={level.name}
                            selectedPinIds={selectedPinIds}
                            onTogglePinSelected={togglePinSelected}
                            onToggleSelectAllInPlot={toggleSelectAllInPlot}
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
          formSummary={previewPinData.form}
          projectId={typeof detail.project === "number" ? detail.project : detail.project?.id}
        />
      )}
      <JobFormChecklistGateModal
        open={gateOpen}
        formLabel={pendingFormLabel}
        checklists={checklistEntries}
        saving={gateSaving}
        onClose={() => setGateOpen(false)}
        onConfirm={handleGateConfirm}
      />
    </DetailPagePadding>
  );
}
