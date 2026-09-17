"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchDispatchReturnRequest, approveReturnRequest, rejectReturnRequest } from "@/features/dispatches/api/dispatch.api";
import { toastSuccess, toastError, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { ReturnToStockDetailBody } from "@/features/dispatches/components/return-to-stock-detail-body";
import type { DispatchReturnRequest } from "@/features/dispatches/types/dispatch.types";
import { EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { AppButton } from "@/shared/ui";

type Props = {
  requestId: number;
};

export function ReturnToStockDetailScreen({ requestId }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const dueFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  return (
    <EntityDetailScreen<DispatchReturnRequest>
      entityId={requestId}
      listSection="return-to-stock"
      listRoute={routes.dashboard.returnToStock}
      labels={{
        metaTitle: t("return.detail.metaTitle"),
        backAria: t("return.detail.backAria"),
        retry: t("detail.retry"),
      }}
      loadError={t("return.loadListError")}
      fetch={fetchDispatchReturnRequest}
      getTitle={(detail) => detail.request_number}
      subtitle={(detail) => dispatchReturnWorkerSubtitle(detail)}
      actions={({ detail, retry }) =>
        detail.status === "pending" ? (
          <ReturnRequestActionButtons
            id={detail.id}
            onRefresh={retry}
          />
        ) : null
      }
    >
      {({ detail }) => (
        <ReturnToStockDetailBody detail={detail} dueFmt={dueFmt} />
      )}
    </EntityDetailScreen>
  );
}

function dispatchReturnWorkerSubtitle(detail: DispatchReturnRequest): string {
  const worker = detail.worker_name;
  if (typeof worker === "object" && worker?.name?.trim()) return worker.name.trim();
  return "";
}

// ---------------------------------------------------------------------------
// Header action buttons (approve / reject) — only rendered when status=pending
// ---------------------------------------------------------------------------
function ReturnRequestActionButtons({
  id,
  onRefresh,
}: {
  id: number;
  onRefresh: () => void;
}) {
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleApprove() {
    setApproving(true);
    setError(null);
    try {
      await approveReturnRequest(id);
      toastSuccess("Return request approved successfully");
      onRefresh();
    } catch (err: any) {
      const msg = getApiErrorDisplayMessage(err, "Failed to approve return request");
      setError(msg);
      toastError(msg);
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    setError(null);
    try {
      await rejectReturnRequest(id);
      toastSuccess("Return request rejected");
      onRefresh();
    } catch (err: any) {
      const msg = getApiErrorDisplayMessage(err, "Failed to reject return request");
      setError(msg);
      toastError(msg);
    } finally {
      setRejecting(false);
    }
  }

  const busy = approving || rejecting;

  return (
    <>
      {error && (
        <span className="mr-1 text-xs text-red-600 dark:text-red-400">{error}</span>
      )}

      {/* Reject — outlined */}
      <AppButton
        onClick={handleReject}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        {rejecting && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        )}
        Reject
      </AppButton>

      {/* Approve — primary */}
      <AppButton
        onClick={handleApprove}
        disabled={busy}
      // className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {approving && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        Approve
      </AppButton>
    </>
  );
}
