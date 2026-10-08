"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import {
  createPurchaseReceive,
  fetchPurchaseReceive,
  updatePurchaseReceive,
} from "@/features/purchase-receives/api/purchase-receive.api";
import {
  createPurchaseReceiveFormSchema,
  type PurchaseReceiveFormValues,
} from "@/features/purchase-receives/schemas/purchase-receive-form-schema";
import {
  emptyPurchaseReceiveFormDefaults,
  emptyPurchaseReceiveLineItem,
  lineItemsFromPurchaseOrder,
  mapPurchaseReceiveFormToPayload,
  purchaseReceiveToFormDefaults,
} from "@/features/purchase-receives/utils/purchase-receive-form-map";
import { fetchPurchaseOrder, fetchPurchaseOrdersPage } from "@/features/purchase-orders/api/purchase-order.api";
import { nestedId as poNestedId } from "@/features/purchase-orders/utils/purchase-order-nested-fields.util";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { FIELD_MAX_LENGTH, rhfRegisterOptions } from "@/shared/form";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import {
  AppButton,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  NumericInput,
  RequiredMark,
  SurfaceDateInput,
  SurfaceShell,
  surfaceInputClassName,
  surfaceTextareaClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  purchaseReceiveId?: number;
};

type Option = { value: string; label: string };

export function PurchaseReceiveFormScreen({ mode, purchaseReceiveId }: Props) {
  const t = useTranslations("Dashboard.purchaseReceives");
  const router = useRouter();
  const pathname = usePathname();
  const safeBack = useFormBackUrl("purchase-receives", routes.dashboard.purchaseReceives);
  const listHref = React.useMemo(() => {
    const needle = routes.dashboard.purchaseReceives;
    const i = pathname.indexOf(needle);
    return i >= 0 ? pathname.slice(0, i + needle.length) : needle;
  }, [pathname]);
  const listBack = safeBack ?? listHref;
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [vendorOptions, setVendorOptions] = React.useState<Option[]>([]);
  const [poOptions, setPoOptions] = React.useState<Option[]>([]);
  const [loadingPoLines, setLoadingPoLines] = React.useState(false);

  const schema = React.useMemo(
    () =>
      createPurchaseReceiveFormSchema({
        vendor: t("validation.vendor"),
        receiveDate: t("validation.receiveDate"),
        status: t("validation.status"),
        lineItem: t("validation.lineItem"),
        receivedQuantity: t("validation.receivedQuantity"),
      }),
    [t],
  );

  const {
    control,
    register,
    reset,
    setValue,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<PurchaseReceiveFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyPurchaseReceiveFormDefaults(),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "line_items" });
  const lineItems = useWatch({ control, name: "line_items" }) ?? [];
  const selectedPo = useWatch({ control, name: "purchase_order" });

  const statusOptions = React.useMemo(
    () => [
      { value: "draft", label: t("status.draft") },
      { value: "partial", label: t("status.partial") },
      { value: "received", label: t("status.received") },
      { value: "cancelled", label: t("status.cancelled") },
    ],
    [t],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [vendors, pos] = await Promise.all([
          fetchVendorsPage(1, 20, { is_active: true, dropdown: true }),
          fetchPurchaseOrdersPage(1, 50),
        ]);
        if (cancelled) return;
        setVendorOptions(vendors.items.map((v) => ({ value: String(v.id), label: v.name })));
        setPoOptions(
          pos.items.map((p) => ({
            value: String(p.id),
            label: p.purchase_order_number?.trim() || `PO #${p.id}`,
          })),
        );
      } catch {
        if (!cancelled) {
          setVendorOptions([]);
          setPoOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isEdit || !purchaseReceiveId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchPurchaseReceive(purchaseReceiveId);
        if (!cancelled) reset(purchaseReceiveToFormDefaults(row));
      } catch {
        if (!cancelled) setScreenError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, purchaseReceiveId, reset, t]);

  async function loadLinesFromPurchaseOrder(poIdRaw: string) {
    if (!/^\d+$/.test(poIdRaw)) {
      setValue("line_items", [emptyPurchaseReceiveLineItem()], { shouldDirty: true });
      return;
    }
    const poId = Number.parseInt(poIdRaw, 10);
    setLoadingPoLines(true);
    try {
      const order = await fetchPurchaseOrder(poId);
      const vendorId = poNestedId(order.vendor);
      if (vendorId != null) {
        setValue("vendor", String(vendorId), { shouldDirty: true, shouldValidate: true });
      }
      setValue("line_items", lineItemsFromPurchaseOrder(order), { shouldDirty: true });
    } catch {
      setValue("line_items", [emptyPurchaseReceiveLineItem()], { shouldDirty: true });
    } finally {
      setLoadingPoLines(false);
    }
  }

  async function submit(values: PurchaseReceiveFormValues) {
    const payload = mapPurchaseReceiveFormToPayload(values);
    setSaving(true);
    try {
      const saved =
        isEdit && purchaseReceiveId
          ? await updatePurchaseReceive(purchaseReceiveId, payload)
          : await createPurchaseReceive(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.purchaseReceives, saved.id, listBack));
    } catch (error) {
      reportFormSubmitApiError(error, setError, isEdit ? t("updateError") : t("createError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={listBack}
        backAriaLabel={t("detail.backAria")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(listBack)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="pr-upsert-form" variant="primary" size="sm" loading={saving}>
              {t("modal.save")}
            </AppButton>
          </div>
        }
      />

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loadingExisting ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : screenError ? (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">{screenError}</p>
        ) : (
          <form id="pr-upsert-form" className="space-y-10 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.basic")}
              </h2>
              <FormFieldRow cols="2">
                <FieldGroup label={t("fields.purchaseReceiveNumber")} htmlFor="pr-number">
                  <input
                    id="pr-number"
                    className={surfaceInputClassName}
                    disabled={saving}
                    maxLength={FIELD_MAX_LENGTH.TITLE}
                    {...register("purchase_receive_number", rhfRegisterOptions("title"))}
                  />
                </FieldGroup>
                <FieldGroup label={t("fields.receiveDate")} htmlFor="pr-date" required>
                  <SurfaceDateInput id="pr-date" type="date" disabled={saving} {...register("receive_date")} />
                  <FieldErrorText>{errors.receive_date?.message}</FieldErrorText>
                </FieldGroup>
              </FormFieldRow>

              <FormFieldRow cols="2">
                <Controller
                  control={control}
                  name="purchase_order"
                  render={({ field }) => (
                    <CheckmarkSelect
                      id="pr-po"
                      label={t("fields.purchaseOrder")}
                      options={poOptions}
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        void loadLinesFromPurchaseOrder(v);
                      }}
                      emptyLabel={t("placeholders.purchaseOrder")}
                      disabled={saving || loadingPoLines}
                      listLabel={t("fields.purchaseOrder")}
                      portaled
                      searchable
                      clearable
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="vendor"
                  render={({ field }) => (
                    <FieldGroup label={t("fields.vendor")} htmlFor="pr-vendor" required>
                      <CheckmarkSelect
                        id="pr-vendor"
                        options={vendorOptions}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel={t("placeholders.vendor")}
                        disabled={saving}
                        invalid={!!errors.vendor}
                        listLabel={t("fields.vendor")}
                        portaled
                        searchable
                      />
                      <FieldErrorText>{errors.vendor?.message}</FieldErrorText>
                    </FieldGroup>
                  )}
                />
              </FormFieldRow>

              <FormFieldRow cols="2">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <CheckmarkSelect
                      id="pr-status"
                      label={t("fields.status")}
                      options={statusOptions}
                      value={field.value}
                      onChange={field.onChange}
                      emptyLabel={t("placeholders.status")}
                      disabled={saving}
                      invalid={!!errors.status}
                      listLabel={t("fields.status")}
                      portaled
                    />
                  )}
                />
                <FieldGroup label={t("fields.trackingNumber")} htmlFor="pr-tracking">
                  <input
                    id="pr-tracking"
                    className={surfaceInputClassName}
                    disabled={saving}
                    maxLength={FIELD_MAX_LENGTH.TITLE}
                    {...register("tracking_number", rhfRegisterOptions("title"))}
                  />
                </FieldGroup>
              </FormFieldRow>

              <FieldGroup label={t("fields.trackingLink")} htmlFor="pr-tracking-link">
                <input
                  id="pr-tracking-link"
                  className={surfaceInputClassName}
                  disabled={saving}
                  maxLength={FIELD_MAX_LENGTH.GENERIC_TEXT}
                  {...register("tracking_link", rhfRegisterOptions("text"))}
                />
              </FieldGroup>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("sections.lineItems")}
                </h2>
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={saving}
                  onClick={() => append(emptyPurchaseReceiveLineItem())}
                >
                  {t("lineItems.addItem")}
                </AppButton>
              </div>
              {errors.line_items?.root?.message || errors.line_items?.message ? (
                <FieldErrorText>
                  {errors.line_items?.root?.message || errors.line_items?.message}
                </FieldErrorText>
              ) : null}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                      <th className="px-3 py-2">
                        {t("lineItems.item")}
                        <RequiredMark alwaysVisible />
                      </th>
                      <th className="px-3 py-2">{t("lineItems.orderedQty")}</th>
                      <th className="px-3 py-2">{t("lineItems.receivedQty")}</th>
                      <th className="px-3 py-2">{t("lineItems.billedQty")}</th>
                      <th className="px-3 py-2">{t("lineItems.unitPrice")}</th>
                      <th className="px-3 py-2 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const row = lineItems[index];
                      return (
                        <tr key={field.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 align-top">
                            <input type="hidden" {...register(`line_items.${index}.item`)} />
                            <input type="hidden" {...register(`line_items.${index}.group`)} />
                            <input type="hidden" {...register(`line_items.${index}.item_name`)} />
                            <div className="min-w-[10rem] text-sm font-medium text-slate-900 dark:text-slate-100">
                              {row?.item_name?.trim() || (row?.item ? `#${row.item}` : "—")}
                            </div>
                            <FieldErrorText>{errors.line_items?.[index]?.item?.message}</FieldErrorText>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <NumericInput
                              size="sm"
                              value={row?.ordered_quantity ?? ""}
                              disabled={saving}
                              onChange={(next) =>
                                setValue(`line_items.${index}.ordered_quantity`, next, {
                                  shouldDirty: true,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <NumericInput
                              size="sm"
                              value={row?.received_quantity ?? ""}
                              invalid={Boolean(errors.line_items?.[index]?.received_quantity)}
                              disabled={saving}
                              onChange={(next) =>
                                setValue(`line_items.${index}.received_quantity`, next, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                              }
                            />
                            <FieldErrorText>
                              {errors.line_items?.[index]?.received_quantity?.message}
                            </FieldErrorText>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <NumericInput
                              size="sm"
                              value={row?.billed_quantity ?? ""}
                              disabled={saving}
                              onChange={(next) =>
                                setValue(`line_items.${index}.billed_quantity`, next, {
                                  shouldDirty: true,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              className={cn(surfaceInputClassName, "h-8 w-28 text-sm")}
                              disabled={saving}
                              {...register(`line_items.${index}.unit_price`)}
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <AppButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={saving || fields.length <= 1}
                              onClick={() => remove(index)}
                              aria-label={t("lineItems.remove")}
                            >
                              <Trash2 className="size-4 text-red-600" aria-hidden />
                            </AppButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selectedPo ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("lineItems.fromPurchaseOrderHint")}</p>
              ) : null}
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.notes")}
              </h2>
              <FieldGroup label={t("fields.notes")} htmlFor="pr-notes">
                <textarea
                  id="pr-notes"
                  rows={3}
                  className={cn(surfaceTextareaClassName, "min-h-[80px]")}
                  disabled={saving}
                  maxLength={FIELD_MAX_LENGTH.DESCRIPTION}
                  {...register("notes", rhfRegisterOptions("description"))}
                />
              </FieldGroup>
            </section>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
