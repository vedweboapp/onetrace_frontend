"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import {
  createPaymentTerm,
  deletePaymentTerm,
  fetchPaymentTermsPage,
  updatePaymentTerm,
} from "@/features/payment-terms/api/payment-term.api";
import type { PaymentTerm } from "@/features/payment-terms/types/payment-term.types";
import {
  formatPaymentTermDiscount,
  formatPaymentTermLabel,
} from "@/features/payment-terms/utils/payment-term-display.util";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import {
  SettingsDetailActions,
  SettingsDetailList,
  SettingsDetailRow,
  SettingsDetailTextValue,
  SettingsDetailTimestampValue,
  SettingsDetailTitle,
  settingsDetailUserLabel,
} from "@/shared/components/settings/settings-detail-view";
import { getApiErrorDisplayMessage, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { sanitizeDigitsInput, sanitizeTitleInput } from "@/shared/form/field-input.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { routes } from "@/shared/config/routes";
import {
  AddButton,
  AppButton,
  AppModal,
  ConfirmDialog,
  DataTablePaginationBar,
  DetailPanel,
  FieldGroup,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageEmptyStates,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
  listPageRootClassName,
  listPageSurfaceShellClassName,
  surfaceInputClassName,
  surfaceSelectClassName,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

const TYPE_OPTIONS = ["standard"] as const;

function paymentTermUserLabel(user: PaymentTerm["created_by"]): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return `#${user.id}`;
}

function yesNo(value: boolean, yes: string, no: string) {
  return value ? yes : no;
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseNonNegNumber(raw: string, fallback = 0): number {
  const t = raw.trim();
  if (!t) return fallback;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function PaymentTermSettingsPanel() {
  const t = useTranslations("Dashboard.paymentTerms");
  const tList = useTranslations("Dashboard.list");
  const tCustomization = useTranslations("Dashboard.settingsNav.customization");
  const dateFmt = useDashboardDateFormat();
  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } =
    useListUrlState();

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  const [items, setItems] = React.useState<PaymentTerm[]>([]);
  const [pagination, setPagination] = React.useState({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    next: null as string | null,
    previous: null as string | null,
  });
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [detailRow, setDetailRow] = React.useState<PaymentTerm | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PaymentTerm | null>(null);
  const [label, setLabel] = React.useState("");
  const [days, setDays] = React.useState("0");
  const [discountPct, setDiscountPct] = React.useState("0");
  const [discountDueDays, setDiscountDueDays] = React.useState("");
  const [termType, setTermType] = React.useState<string>("standard");
  const [isDefault, setIsDefault] = React.useState(false);
  const [isSystemTerms, setIsSystemTerms] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    payment_term_label?: string;
    payment_term_days?: string;
    payment_terms_discount_percentage?: string;
  }>({});

  const [deleteTarget, setDeleteTarget] = React.useState<PaymentTerm | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchPaymentTermsPage(page, pageSize, {
          search: search || undefined,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, refreshNonce, search, t]);

  const hasActiveFilters = hasListActiveFilters({ search });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

  const openEdit = React.useCallback((row: PaymentTerm) => {
    setDetailRow(null);
    setEditing(row);
    setLabel(formatPaymentTermLabel(row));
    setDays(String(row.payment_term_days ?? 0));
    setDiscountPct(formatPaymentTermDiscount(row));
    setDiscountDueDays(
      row.payment_terms_discount_due_days != null ? String(row.payment_terms_discount_due_days) : "",
    );
    setTermType(row.type?.trim() || "standard");
    setIsDefault(Boolean(row.is_default));
    setIsSystemTerms(Boolean(row.is_system_terms));
    setErrors({});
    setFormOpen(true);
  }, []);

  function openCreate() {
    setDetailRow(null);
    setEditing(null);
    setLabel("");
    setDays("0");
    setDiscountPct("0");
    setDiscountDueDays("");
    setTermType("standard");
    setIsDefault(false);
    setIsSystemTerms(false);
    setErrors({});
    setFormOpen(true);
  }

  async function submitForm() {
    const formSchema = z.object({
      payment_term_label: zTrimmedNonEmpty(t("validationLabel")),
      payment_term_days: z
        .string()
        .trim()
        .refine((v) => /^\d+$/.test(v), t("validationDays")),
      payment_terms_discount_percentage: z
        .string()
        .trim()
        .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), t("validationDiscount")),
    });
    const parsed = formSchema.safeParse({
      payment_term_label: label,
      payment_term_days: days,
      payment_terms_discount_percentage: discountPct,
    });
    if (!parsed.success) {
      const nextErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (
          key === "payment_term_label" ||
          key === "payment_term_days" ||
          key === "payment_terms_discount_percentage"
        ) {
          nextErrors[key] = String(issue.message);
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const payload = {
      payment_term_label: parsed.data.payment_term_label,
      payment_term_days: Number.parseInt(parsed.data.payment_term_days, 10),
      payment_terms_discount_percentage: parseNonNegNumber(parsed.data.payment_terms_discount_percentage, 0),
      payment_terms_discount_due_days: parseOptionalInt(discountDueDays),
      type: termType || "standard",
      is_default: isDefault,
      is_system_terms: isSystemTerms,
    };
    setSaving(true);
    try {
      if (editing) {
        await updatePaymentTerm(editing.id, payload);
        toastSuccess(t("saved"));
      } else {
        await createPaymentTerm(payload);
        toastSuccess(t("created"));
      }
      setFormOpen(false);
      if (!editing) setUrl({ page: null });
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      reportLocalFormSubmitApiError(error, (fieldErrors) => {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePaymentTerm(deleteTarget.id);
      toastSuccess(t("deleted"));
      setDeleteTarget(null);
      setRefreshNonce((n) => n + 1);
    } finally {
      setDeleting(false);
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<PaymentTerm>();
    return [
      c.primary("label", t("table.label"), (row) => formatPaymentTermLabel(row)),
      c.text("days", t("table.days"), (row) => String(row.payment_term_days ?? 0)),
      c.custom("default", t("table.default"), (row) => (
        <span className="text-slate-600 dark:text-slate-300">
          {yesNo(row.is_default, t("yes"), t("no"))}
        </span>
      )),
      c.text("type", t("table.type"), (row) => row.type || "—"),
      c.text("discount", t("table.discount"), (row) => `${formatPaymentTermDiscount(row)}%`),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">
              {formatFlexibleApiDate(row.created_at, dateFmt)}
            </span>
            {paymentTermUserLabel(row.created_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {paymentTermUserLabel(row.created_by)}
              </span>
            ) : null}
          </>
        ),
      ),
    ];
  }, [t, dateFmt]);

  const canDeleteDetail = detailRow && !detailRow.is_system_generated && !detailRow.is_system_terms;

  return (
    <div className={listPageRootClassName()}>
      {!hideListChrome ? (
        <ListPageHeader
          backHref={routes.dashboard.settingsCustomization}
          backAriaLabel={tCustomization("backToHub")}
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={<AddButton type="button" onClick={openCreate} />}
          controls={
            <ListPageSearchField
              value={search}
              onCommit={commitSearch}
              className="sm:max-w-sm"
            />
          }
        />
      ) : null}

      <SurfaceShell className={listPageSurfaceShellClassName(hideListChrome)}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : listLoading ? (
          listViewMode === "list" ? (
            <div className="p-4 sm:p-6">
              <ListPageCardGrid>
                {Array.from({ length: 6 }, (_, i) => (
                  <ListPageCardSkeleton key={i} />
                ))}
              </ListPageCardGrid>
            </div>
          ) : (
            <div className="space-y-2 p-6">
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          )
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "customization",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: <AddButton type="button" onClick={openCreate} />,
            }}
            onClearFilters={() => setUrl({ search: null, page: null }, { replace: true })}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  title={formatPaymentTermLabel(row)}
                  meta={
                    <>
                      {t("table.days")}: {row.payment_term_days}
                      {row.is_default ? ` · ${t("table.default")}` : ""}
                      {row.type ? ` · ${row.type}` : ""}
                    </>
                  }
                  description={`${t("detail.createdAt")}: ${formatFlexibleApiDate(row.created_at, dateFmt)}`}
                  onCardClick={() => setDetailRow(row)}
                />
              ))}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable columns={tableColumns} rows={items} onRowClick={(row) => setDetailRow(row)} />
        )}

        {!listLoading && !loadError && items.length > 0 ? (
          <DataTablePaginationBar
            pagination={pagination}
            summary={t("pageLabel", {
              start: pageRange.start,
              end: pageRange.end,
              total: pagination.total_records,
            })}
            prevLabel={t("prev")}
            nextLabel={t("next")}
            onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
            onNext={() => setPage(pagination.current_page + 1)}
            onPageSelect={(p) => setPage(p)}
            pageSizeControl={{
              label: tList("rowsPerPage"),
              listLabel: tList("rowsPerPage"),
              value: pageSize,
              options: pageSizeOptions,
              onChange: setPageSize,
              disabled: listLoading,
            }}
          />
        ) : null}
      </SurfaceShell>

      <DetailPanel
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        title={
          detailRow ? (
            <SettingsDetailTitle
              name={formatPaymentTermLabel(detailRow)}
              idLabel={t("detail.idLabel", { id: detailRow.id })}
            />
          ) : null
        }
        footer={
          detailRow ? (
            <SettingsDetailActions
              cancelLabel={t("modal.cancel")}
              editLabel={t("edit")}
              deleteLabel={canDeleteDetail ? t("delete") : undefined}
              onCancel={() => setDetailRow(null)}
              onEdit={() => {
                const row = detailRow;
                setDetailRow(null);
                openEdit(row);
              }}
              onDelete={
                canDeleteDetail
                  ? () => {
                      const row = detailRow;
                      setDetailRow(null);
                      setDeleteTarget(row);
                    }
                  : undefined
              }
            />
          ) : undefined
        }
      >
        {detailRow ? (
          <SettingsDetailList>
            <SettingsDetailRow label={t("table.label")}>
              <SettingsDetailTextValue>{formatPaymentTermLabel(detailRow)}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.days")}>
              <SettingsDetailTextValue>{String(detailRow.payment_term_days ?? 0)}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.default")}>
              <SettingsDetailTextValue>
                {yesNo(detailRow.is_default, t("yes"), t("no"))}
              </SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.discount")}>
              <SettingsDetailTextValue>{`${formatPaymentTermDiscount(detailRow)}%`}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.discountDueDays")}>
              <SettingsDetailTextValue>
                {detailRow.payment_terms_discount_due_days != null
                  ? String(detailRow.payment_terms_discount_due_days)
                  : "—"}
              </SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.type")}>
              <SettingsDetailTextValue>{detailRow.type || "—"}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("table.status")}>
              <SettingsDetailTextValue>{detailRow.status || "—"}</SettingsDetailTextValue>
            </SettingsDetailRow>
            <SettingsDetailRow label={t("detail.createdAt")}>
              <SettingsDetailTimestampValue
                dateFmt={dateFmt}
                value={detailRow.created_at}
                byUser={settingsDetailUserLabel(detailRow.created_by)}
                byUserTemplate={
                  settingsDetailUserLabel(detailRow.created_by) !== "—"
                    ? t("detail.byUser", { user: settingsDetailUserLabel(detailRow.created_by) })
                    : null
                }
              />
            </SettingsDetailRow>
            <SettingsDetailRow label={t("detail.updatedAt")}>
              <SettingsDetailTimestampValue
                dateFmt={dateFmt}
                value={detailRow.modified_at}
                byUser={settingsDetailUserLabel(detailRow.modified_by)}
                byUserTemplate={
                  settingsDetailUserLabel(detailRow.modified_by) !== "—"
                    ? t("detail.byUser", { user: settingsDetailUserLabel(detailRow.modified_by) })
                    : null
                }
              />
            </SettingsDetailRow>
          </SettingsDetailList>
        ) : null}
      </DetailPanel>

      <AppModal
        open={formOpen}
        onClose={() => (!saving ? setFormOpen(false) : undefined)}
        title={editing ? t("modal.editTitle") : t("modal.createTitle")}
        titleId="payment-term-form-title"
        closeOnBackdrop={!saving}
        isBusy={saving}
        footer={
          <>
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => setFormOpen(false)}
            >
              {t("modal.cancel")}
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              onClick={() => void submitForm()}
            >
              {t("modal.save")}
            </AppButton>
          </>
        }
      >
        <div className="space-y-4">
          <FieldGroup label={t("modal.label")} htmlFor="payment-term-label" required>
            <input
              id="payment-term-label"
              className={cn(surfaceInputClassName, errors.payment_term_label && "border-red-400")}
              value={label}
              onChange={(e) => {
                setLabel(sanitizeTitleInput(e.target.value));
                if (errors.payment_term_label) {
                  setErrors((prev) => ({ ...prev, payment_term_label: undefined }));
                }
              }}
              placeholder={t("modal.labelPlaceholder")}
              disabled={saving}
            />
            {errors.payment_term_label ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.payment_term_label}</p>
            ) : null}
          </FieldGroup>
          <FieldGroup label={t("modal.days")} htmlFor="payment-term-days" required>
            <input
              id="payment-term-days"
              inputMode="numeric"
              className={cn(surfaceInputClassName, errors.payment_term_days && "border-red-400")}
              value={days}
              onChange={(e) => {
                setDays(sanitizeDigitsInput(e.target.value));
                if (errors.payment_term_days) {
                  setErrors((prev) => ({ ...prev, payment_term_days: undefined }));
                }
              }}
              placeholder="0"
              disabled={saving}
            />
            {errors.payment_term_days ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.payment_term_days}</p>
            ) : null}
          </FieldGroup>
          <FieldGroup label={t("modal.discount")} htmlFor="payment-term-discount">
            <input
              id="payment-term-discount"
              inputMode="decimal"
              className={cn(
                surfaceInputClassName,
                errors.payment_terms_discount_percentage && "border-red-400",
              )}
              value={discountPct}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d.]/g, "");
                setDiscountPct(next);
                if (errors.payment_terms_discount_percentage) {
                  setErrors((prev) => ({ ...prev, payment_terms_discount_percentage: undefined }));
                }
              }}
              placeholder="0.00"
              disabled={saving}
            />
            {errors.payment_terms_discount_percentage ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.payment_terms_discount_percentage}
              </p>
            ) : null}
          </FieldGroup>
          <FieldGroup label={t("modal.discountDueDays")} htmlFor="payment-term-discount-due">
            <input
              id="payment-term-discount-due"
              inputMode="numeric"
              className={surfaceInputClassName}
              value={discountDueDays}
              onChange={(e) => setDiscountDueDays(sanitizeDigitsInput(e.target.value))}
              placeholder={t("modal.discountDueDaysPlaceholder")}
              disabled={saving}
            />
          </FieldGroup>
          <FieldGroup label={t("modal.type")} htmlFor="payment-term-type">
            <select
              id="payment-term-type"
              className={surfaceSelectClassName}
              value={termType}
              onChange={(e) => setTermType(e.target.value)}
              disabled={saving}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </FieldGroup>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              disabled={saving}
              className="h-4 w-4 rounded border-slate-300"
            />
            {t("modal.isDefault")}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={isSystemTerms}
              onChange={(e) => setIsSystemTerms(e.target.checked)}
              disabled={saving || Boolean(editing?.is_system_generated)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {t("modal.isSystemTerms")}
          </label>
        </div>
      </AppModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        confirmVariant="danger"
        isBusy={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
