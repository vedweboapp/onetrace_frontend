"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { restockDispatch } from "@/features/dispatches/api/dispatch.api";
import type { DispatchDetail, DispatchLineItem } from "@/features/dispatches/types/dispatch.types";
import { dispatchWorkerLabel } from "@/features/dispatches/utils/dispatch-display.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { cn } from "@/core/utils/http.util";
import { AppButton, AppModal, surfaceInputClassName } from "@/shared/ui";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  dispatchId: number;
  line: DispatchLineItem;
  dateFmt: Intl.DateTimeFormat;
  onRestocked: (detail: DispatchDetail) => void;
  onClose: () => void;
};

const inputClass = cn(surfaceInputClassName, "h-9 w-24 rounded-md px-2.5 text-right text-sm");

export function DispatchLineDetailPanel({ dispatchId, line, dateFmt, onRestocked, onClose }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const returnable = Math.max(0, line.dispatched_quantity - line.restocked_quantity);
  const [qty, setQty] = React.useState(String(returnable > 0 ? returnable : ""));
  const [saving, setSaving] = React.useState(false);

  async function handleRestock() {
    const quantity = Number.parseFloat(qty.trim());
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    setSaving(true);
    try {
      const updated = await restockDispatch(dispatchId, { lines: [{ line_id: line.id, quantity }] });
      toastSuccess(t("restock.successToast"));
      onRestocked(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open
      onClose={() => (!saving ? onClose() : undefined)}
      title={line.item.name?.trim() || `#${line.item.id}`}
      size="md"
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            {t("restock.close")}
          </AppButton>
          {returnable > 0 ? (
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              onClick={() => void handleRestock()}
            >
              {t("restock.confirm")}
            </AppButton>
          ) : null}
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("table.jobName")}</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {line.job?.title?.trim() || (line.is_extra ? t("detail.extraItem") : "—")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("table.workerName")}</dt>
            <dd className="mt-1 font-medium">{dispatchWorkerLabel(line.worker_name)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("table.requested")}</dt>
            <dd className="mt-1 tabular-nums font-medium">{line.requested_quantity.toFixed(0)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("table.dispatched")}</dt>
            <dd className="mt-1 tabular-nums font-medium">{line.dispatched_quantity.toFixed(0)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("table.pending")}</dt>
            <dd className="mt-1 tabular-nums">{line.pending_quantity.toFixed(0)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("table.extra")}</dt>
            <dd className="mt-1 tabular-nums">
              {line.extra_quantity > 0 ? `+${line.extra_quantity.toFixed(0)}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("table.restocked")}</dt>
            <dd className="mt-1 tabular-nums">{line.restocked_quantity.toFixed(0)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("fields.dispatchDate")}</dt>
            <dd className="mt-1">
              {line.dispatched_at ? formatFlexibleApiDate(line.dispatched_at, dateFmt) : "—"}
            </dd>
          </div>
        </dl>

        {line.restock_history.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("detail.restockHistory")}
            </h3>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {line.restock_history.map((entry, index) => (
                <li key={`${entry.restocked_at}-${index}`} className="flex justify-between gap-3 px-3 py-2">
                  <span className="tabular-nums font-medium">+{entry.quantity.toFixed(0)} {t("units")}</span>
                  <span className="text-slate-500">
                    {formatFlexibleApiDate(entry.restocked_at, dateFmt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {returnable > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">{t("restock.hint")}</p>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{t("restock.returnQty")}</span>
              <input
                type="number"
                min={0}
                max={returnable}
                step="any"
                value={qty}
                disabled={saving}
                className={inputClass}
                onChange={(e) => setQty(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
