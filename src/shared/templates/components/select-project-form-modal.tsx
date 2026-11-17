"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Check, Loader2, FileText, X } from "lucide-react";
import { AppModal, AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { fetchFormsPage } from "@/features/forms/api/forms.api";
import type { FormListItem } from "@/features/forms/types/form.types";

export interface SelectProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (formId: number | string, form: FormListItem) => void;
}

export function SelectProjectFormModal({
  open,
  onClose,
  onSelect,
}: SelectProjectFormModalProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<FormListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch a given page
  const loadPage = useCallback(
    async (pageNum: number, isReset: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      if (isReset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const res = await fetchFormsPage(pageNum, 20, {
          is_published: true,
          search: debouncedSearch.trim() || undefined,
        });

        const newItems = res.items ?? [];
        setItems((prev) => (isReset ? newItems : [...prev, ...newItems]));
        setPage(pageNum);

        const totalPages = res.pagination?.total_pages ?? 1;
        const hasNext = Boolean(
          res.pagination?.next || (totalPages > 0 && pageNum < totalPages),
        );
        setHasMore(hasNext);
      } catch (err) {
        console.error("Failed to load forms for template:", err);
        setError("Failed to load forms. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [debouncedSearch],
  );

  // Re-fetch when modal opens or debounced search changes
  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setSearch("");
      setDebouncedSearch("");
      setItems([]);
      setPage(1);
      setHasMore(false);
      return;
    }
    void loadPage(1, true);
  }, [open, debouncedSearch, loadPage]);

  // Infinite scroll observer
  useEffect(() => {
    if (!open || !hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingRef.current) {
          void loadPage(page + 1, false);
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [open, hasMore, loading, loadingMore, page, loadPage]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop - clientHeight < 60 &&
      hasMore &&
      !loading &&
      !loadingMore &&
      !loadingRef.current
    ) {
      void loadPage(page + 1, false);
    }
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    const selectedForm = items.find((f) => f.id === selectedId);
    if (selectedForm) {
      onSelect(selectedId, selectedForm);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Select Project Form"
      description="Choose a published project form to generate this template for. Form variables will be loaded automatically."
      size="md"
      className="max-w-[420px]"
      footer={
        <>
          <AppButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            disabled={!selectedId}
            onClick={handleConfirm}
          >
            Continue
          </AppButton>
        </>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        {/* Real API Search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search forms by name or API name…"
            className="w-full h-8.5 pl-8 pr-8 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Scrollable list with scroll pagination */}
        <div
          onScroll={handleScroll}
          className="flex flex-col gap-1.5 max-h-[380px] min-h-[200px] overflow-y-auto pr-1"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="size-6 animate-spin text-teal-600" />
              <p className="text-xs">Loading published forms…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-red-500">
              <p className="text-sm font-medium">{error}</p>
              <AppButton
                variant="secondary"
                size="sm"
                onClick={() => void loadPage(1, true)}
              >
                Retry
              </AppButton>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-slate-400">
              <FileText className="size-8 stroke-1 text-slate-300 dark:text-slate-600" />
              <p className="text-sm">No published forms found</p>
            </div>
          ) : (
            <>
              {items.map((form) => {
                const isSelected = selectedId === form.id;
                return (
                  <button
                    key={form.id}
                    type="button"
                    onClick={() => setSelectedId(form.id)}
                    onDoubleClick={() => {
                      setSelectedId(form.id);
                      onSelect(form.id, form);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer group",
                      isSelected
                        ? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 dark:border-teal-500 shadow-2xs"
                        : "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/70 dark:hover:bg-slate-800/70",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Project custom select checkmark */}
                      <span
                        className={cn(
                          "flex size-4.5 shrink-0 items-center justify-center rounded border transition-all",
                          isSelected
                            ? "border-transparent bg-teal-600 dark:bg-teal-500 text-white shadow-2xs"
                            : "border-slate-300 dark:border-slate-600 bg-transparent text-transparent group-hover:border-slate-400",
                        )}
                        aria-hidden
                      >
                        <Check className="size-3" strokeWidth={2.5} />
                      </span>
                      <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate leading-normal">
                        {form.name}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Sentinel for infinite scroll */}
              <div ref={sentinelRef} className="h-2 w-full shrink-0" />

              {loadingMore && (
                <div className="flex items-center justify-center py-2 text-slate-400 gap-1.5 text-xs">
                  <Loader2 className="size-3.5 animate-spin text-teal-600" />
                  <span>Loading more forms…</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppModal>
  );
}
