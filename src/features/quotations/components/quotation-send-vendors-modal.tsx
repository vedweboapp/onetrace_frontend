"use client";

import * as React from "react";
import { Building2, Check, Loader2, Mail, Phone, Search, X } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import { getVendorTypeRows } from "@/features/vendors/utils/vendor-nested-fields.util";
import { sendQuotation } from "@/features/quotations/api/quotation.api";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal } from "@/shared/ui";

const PAGE_SIZE = 20;

type Props = {
  open: boolean;
  quotationId: number;
  quoteName?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function QuotationSendVendorsModal({
  open,
  quotationId,
  quoteName,
  onClose,
  onSuccess,
}: Props) {
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasNext, setHasNext] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset and fetch page 1 on open or search change
  React.useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearch("");
      setDebouncedSearch("");
      setVendors([]);
      setPage(1);
      setHasNext(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setPage(1);

    (async () => {
      try {
        const query = debouncedSearch.trim() || undefined;
        const res = await fetchVendorsPage(1, PAGE_SIZE, { search: query, is_active: true }, { silent: true });
        if (!cancelled) {
          setVendors(res.items ?? []);
          const totalPages = res.pagination?.total_pages ?? 1;
          setHasNext(Boolean(res.pagination?.next) || 1 < totalPages);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load vendors");
          setVendors([]);
          setHasNext(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch]);

  // Load next page for infinite scroll
  const loadNextPage = React.useCallback(async () => {
    if (loading || loadingMore || !hasNext) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const query = debouncedSearch.trim() || undefined;
      const res = await fetchVendorsPage(nextPage, PAGE_SIZE, { search: query, is_active: true }, { silent: true });
      setVendors((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        const newItems = (res.items ?? []).filter((v) => !seen.has(v.id));
        return [...prev, ...newItems];
      });
      setPage(nextPage);
      const totalPages = res.pagination?.total_pages ?? 1;
      setHasNext(Boolean(res.pagination?.next) || nextPage < totalPages);
    } catch {
      // Keep existing list on pagination error
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasNext, page, debouncedSearch]);

  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (scrollBottom < 60) {
        void loadNextPage();
      }
    },
    [loadNextPage],
  );

  const allVisibleSelected =
    vendors.length > 0 && vendors.every((v) => selectedIds.has(v.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const v of vendors) {
          next.delete(v.id);
        }
      } else {
        for (const v of vendors) {
          next.add(v.id);
        }
      }
      return next;
    });
  };

  const toggleVendor = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  async function handleSend() {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      await sendQuotation(quotationId, {
        notification_send_to: "vendors",
        vendor_ids: Array.from(selectedIds),
      });
      toastSuccess("Quotation sent to selected vendors successfully");
      onClose();
      onSuccess?.();
    } catch (error) {
      toastApiError(error, "Failed to send quotation to vendors");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal
      open={open}
      onClose={() => (!submitting ? onClose() : undefined)}
      title="Send Quotation to Vendors"
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {selectedIds.size === 1
              ? "1 vendor selected"
              : `${selectedIds.size} vendors selected`}
          </span>
          <div className="flex items-center justify-end gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={submitting}
              onClick={onClose}
            >
              Cancel
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={submitting}
              disabled={submitting || selectedIds.size === 0}
              onClick={() => void handleSend()}
            >
              Send Quotation ({selectedIds.size})
            </AppButton>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {quoteName ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select vendors who should receive the quotation notification for{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {quoteName}
            </span>
            .
          </p>
        ) : null}

        {/* Search and Selection Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors by name, email, or phone..."
              className={cn(
                "h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
                "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500",
              )}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          {vendors.length > 0 ? (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 sm:self-center"
            >
              <div
                className={cn(
                  "flex size-4 items-center justify-center rounded border transition-colors",
                  allVisibleSelected
                    ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                    : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900",
                )}
              >
                {allVisibleSelected && <Check className="size-3 stroke-[2.5]" />}
              </div>
              <span>{allVisibleSelected ? "Deselect All" : "Select All"}</span>
            </button>
          ) : null}
        </div>

        {/* Scrollable Vendor List */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="max-h-[340px] min-h-[160px] overflow-y-auto rounded-lg border border-slate-200/80 bg-slate-50/40 p-2 dark:border-slate-800 dark:bg-slate-900/40"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="size-6 animate-spin text-blue-500" />
              <p className="mt-2 text-xs">
                {search.trim() ? "Searching vendors..." : "Loading active vendors..."}
              </p>
            </div>
          ) : loadError ? (
            <div className="py-8 text-center">
              <p className="text-xs font-medium text-rose-500">{loadError}</p>
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Building2 className="size-8 stroke-[1.5] text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {search.trim() ? "No vendors matching search." : "No active vendors available."}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {vendors.map((vendor) => {
                const isSelected = selectedIds.has(vendor.id);
                const vendorTypes = getVendorTypeRows(vendor);

                return (
                  <div
                    key={vendor.id}
                    onClick={() => toggleVendor(vendor.id)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-md border p-2.5 transition-all",
                      isSelected
                        ? "border-blue-500/50 bg-blue-50/70 shadow-xs dark:border-blue-500/40 dark:bg-blue-950/30"
                        : "border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900/60",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                            : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900",
                        )}
                      >
                        {isSelected && <Check className="size-3 stroke-[2.5]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {vendor.name}
                          </span>
                          {vendorTypes.map((vt) => (
                            <span
                              key={vt.id}
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                              style={{
                                backgroundColor: vt.bg_color || "rgba(226, 232, 240, 0.8)",
                                color: vt.text_color || "#334155",
                              }}
                            >
                              {vt.name || `Type #${vt.id}`}
                            </span>
                          ))}
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {vendor.email ? (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="size-3 shrink-0 text-slate-400" />
                              <span className="truncate">{vendor.email}</span>
                            </span>
                          ) : null}
                          {vendor.phone ? (
                            <span className="flex items-center gap-1 truncate">
                              <Phone className="size-3 shrink-0 text-slate-400" />
                              <span>{vendor.phone}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {loadingMore ? (
                <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="size-3.5 animate-spin text-blue-500" />
                  <span>Loading more vendors...</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </AppModal>
  );
}
