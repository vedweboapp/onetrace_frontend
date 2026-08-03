"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { fetchGroup, fetchGroupsPage } from "@/features/groups/api/group.api";
import { createInvoice, fetchInvoice, sendInvoice, updateInvoice } from "@/features/invoices/api/invoice.api";
import { createInvoiceFormSchema, type InvoiceFormValues } from "@/features/invoices/schemas/invoice-form-schema";
import {
  computeFormSubtotal,
  emptyInvoiceFormDefaults,
  emptyInvoiceLineItem,
  invoiceToFormDefaults,
  mapInvoiceFormToPayload,
} from "@/features/invoices/utils/invoice-form-map";
import { formatMoneyDisplay, parseMoneyValue } from "@/features/invoices/utils/invoice-money.util";
import { fetchItemsPage } from "@/features/items/api/item.api";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import { EntityAddressesFields } from "@/shared/components/form/entity-addresses-fields";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { buildEntityDetailHrefAfterSave, sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import {
  AppButton,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  RequiredMark,
  SurfaceDateInput,
  SurfaceShell,
  surfaceInputClassName,
  surfaceTextareaClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  invoiceId?: number;
};

type Option = { value: string; label: string };

export function InvoiceFormScreen({ mode, invoiceId }: Props) {
  const t = useTranslations("Dashboard.invoices");
  const tGroups = useTranslations("Dashboard.groups");
  const tItems = useTranslations("Dashboard.items");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = useFormBackUrl("invoices", routes.dashboard.invoices);
  const invoicesListHref = React.useMemo(() => {
    const needle = routes.dashboard.invoices;
    const i = pathname.indexOf(needle);
    return i >= 0 ? pathname.slice(0, i + needle.length) : needle;
  }, [pathname]);
  const listBack = safeBack ?? invoicesListHref;
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [clientOptions, setClientOptions] = React.useState<Option[]>([]);
  const [contactOptions, setContactOptions] = React.useState<Option[]>([]);
  const [projectOptions, setProjectOptions] = React.useState<Option[]>([]);
  const [groupOptions, setGroupOptions] = React.useState<Option[]>([]);
  const [itemOptions, setItemOptions] = React.useState<Option[]>([]);
  const [itemPriceById, setItemPriceById] = React.useState<Map<number, number>>(new Map());
  const [itemGroupById, setItemGroupById] = React.useState<Map<number, number | null>>(new Map());
  const [groupItemIdsByGroupId, setGroupItemIdsByGroupId] = React.useState<Map<number, Set<number>>>(new Map());
  const [sending, setSending] = React.useState(false);

  const schema = React.useMemo(
    () =>
      createInvoiceFormSchema({
        client: t("validation.client"),
        issueDate: t("validation.issueDate"),
        lineDescription: t("validation.lineDescription"),
        lineQuantity: t("validation.lineQuantity"),
        addressLine1: t("validation.addressLine1"),
        country: t("validation.country"),
        state: t("validation.state"),
        city: t("validation.city"),
        pincode: t("validation.pincode"),
        addressType: t("validation.addressType"),
        addressesMin: t("validation.addressesMin"),
      }),
    [t],
  );

  const {
    control,
    register,
    reset,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyInvoiceFormDefaults(),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "line_items" });
  const selectedClient = useWatch({ control, name: "client" });
  const lineItems = useWatch({ control, name: "line_items" }) ?? [];

  const clientId =
    selectedClient && /^\d+$/.test(selectedClient) ? Number.parseInt(selectedClient, 10) : undefined;
  const getFormDraft = React.useCallback(() => getValues(), [getValues]);
  const restoreFormDraft = React.useCallback(
    (draft: unknown) => {
      reset(draft as InvoiceFormValues, { keepDefaultValues: false });
    },
    [reset],
  );
  const clientQuickCreate = useQuickCreate({ kind: "client", getFormDraft: !isEdit ? getFormDraft : undefined });
  const contactQuickCreate = useQuickCreate({
    kind: "contact",
    clientId,
    addDisabled: !clientId,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const projectQuickCreate = useQuickCreate({
    kind: "project",
    clientId,
    addDisabled: !clientId,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const groupQuickCreate = useQuickCreate({ kind: "group", getFormDraft: !isEdit ? getFormDraft : undefined });
  const itemQuickCreate = useQuickCreate({ kind: "item", getFormDraft: !isEdit ? getFormDraft : undefined });

  const subtotal = React.useMemo(() => computeFormSubtotal(lineItems), [lineItems]);
  const totalBalance = subtotal;

  const groupLabelById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const o of groupOptions) m.set(o.value, o.label);
    return m;
  }, [groupOptions]);

  const itemLabelById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const o of itemOptions) m.set(o.value, o.label);
    return m;
  }, [itemOptions]);

  const paymentTermOptions = React.useMemo(
    () => [
      { value: "net_7", label: t("paymentTerms.net7") },
      { value: "net_45", label: t("paymentTerms.net45") },
      { value: "net_30", label: t("paymentTerms.net30") },
      { value: "net_15", label: t("paymentTerms.net15") },
      { value: "due_on_receipt", label: t("paymentTerms.dueOnReceipt") },
    ],
    [t],
  );

  useQuickCreateReturn({
    restoreFormDraft: !isEdit ? restoreFormDraft : undefined,
    onReloadOptions: async () => {
      try {
        const [clients, projects, groups, items, contacts] = await Promise.all([
          fetchClientsPage(1, 500, { is_active: true }, { silent: true }),
          fetchProjectsPage(1, 500, { is_active: true }),
          fetchGroupsPage(1, 500),
          fetchItemsPage(1, 500, { isActive: true }),
          clientId ? fetchContactsPage(1, 500, { client: clientId, is_active: true }) : Promise.resolve({ items: [] }),
        ]);
        setClientOptions(clients.items.map((c) => ({ value: String(c.id), label: c.name })));
        setContactOptions(
          contacts.items.map((c) => ({
            value: String(c.id),
            label: c.name?.trim() || c.email?.trim() || `#${c.id}`,
          })),
        );
        setProjectOptions(projects.items.map((p) => ({ value: String(p.id), label: p.name })));
        setGroupOptions(groups.items.map((g) => ({ value: String(g.id), label: g.name })));
        const prices = new Map<number, number>();
        const groupMap = new Map<number, number | null>();
        setItemOptions(
          items.items.map((p) => {
            const raw = p.selling_price;
            const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
            if (Number.isFinite(n)) prices.set(p.id, n);
            groupMap.set(p.id, typeof p.group === "number" ? p.group : null);
            return { value: String(p.id), label: p.name?.trim() || p.sku?.trim() || `#${p.id}` };
          }),
        );
        setItemPriceById(prices);
        setItemGroupById(groupMap);
      } catch {
        setClientOptions([]);
        setProjectOptions([]);
        setGroupOptions([]);
        setItemOptions([]);
      }
    },
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget === "client") {
        setValue("client", selectId, { shouldDirty: true, shouldValidate: true });
        setValue("contact", "", { shouldDirty: true });
        return;
      }
      if (selectTarget === "contact") {
        setValue("contact", selectId, { shouldDirty: true, shouldValidate: true });
        return;
      }
      if (selectTarget === "project") {
        setValue("project", selectId, { shouldDirty: true, shouldValidate: true });
        return;
      }
      if (selectTarget === "group") {
        setValue("line_items.0.group", selectId, { shouldDirty: true, shouldValidate: true });
        void fetchGroup(Number.parseInt(selectId, 10))
          .then((g) => {
            setValue("line_items.0.group_name", g.name?.trim() ?? "", { shouldDirty: true });
          })
          .catch(() => {
            setValue("line_items.0.group_name", "", { shouldDirty: true });
          });
        return;
      }
      if (selectTarget === "item") {
        setValue("line_items.0.item", selectId, { shouldDirty: true, shouldValidate: true });
      }
    },
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clients, projects, groups, items] = await Promise.all([
          fetchClientsPage(1, 500, { is_active: true }, { silent: true }),
          fetchProjectsPage(1, 500, { is_active: true }),
          fetchGroupsPage(1, 500),
          fetchItemsPage(1, 500, { isActive: true }),
        ]);
        if (!cancelled) {
          setClientOptions(clients.items.map((c) => ({ value: String(c.id), label: c.name })));
          setProjectOptions(projects.items.map((p) => ({ value: String(p.id), label: p.name })));
          setGroupOptions(groups.items.map((g) => ({ value: String(g.id), label: g.name })));
          const prices = new Map<number, number>();
          const groupMap = new Map<number, number | null>();
          setItemOptions(
            items.items.map((p) => {
              const raw = p.selling_price;
              const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
              if (Number.isFinite(n)) prices.set(p.id, n);
              groupMap.set(p.id, typeof p.group === "number" ? p.group : null);
              return {
                value: String(p.id),
                label: p.name?.trim() || p.sku?.trim() || `#${p.id}`,
              };
            }),
          );
          setItemPriceById(prices);
          setItemGroupById(groupMap);
        }
      } catch {
        if (!cancelled) {
          setClientOptions([]);
          setProjectOptions([]);
          setGroupOptions([]);
          setItemOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!clientId || clientId <= 0) {
      setContactOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchContactsPage(1, 500, { client: clientId, is_active: true });
        if (!cancelled) {
          setContactOptions(
            items.map((c) => ({
              value: String(c.id),
              label: c.name?.trim() || c.email?.trim() || `#${c.id}`,
            })),
          );
        }
      } catch {
        if (!cancelled) setContactOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  React.useEffect(() => {
    const groupIds = Array.from(
      new Set(
        lineItems
          .map((row) => row.group.trim())
          .filter((raw) => /^\d+$/.test(raw))
          .map((raw) => Number.parseInt(raw, 10))
          .filter((id) => !groupItemIdsByGroupId.has(id)),
      ),
    );
    if (groupIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        groupIds.map(async (groupId) => {
          try {
            const group = await fetchGroup(groupId);
            const ids = new Set<number>();
            for (const entry of group.items ?? []) {
              if (typeof entry.item === "number" && Number.isFinite(entry.item)) ids.add(entry.item);
            }
            return { groupId, ids };
          } catch {
            return { groupId, ids: new Set<number>() };
          }
        }),
      );
      if (cancelled) return;
      setGroupItemIdsByGroupId((prev) => {
        const next = new Map(prev);
        for (const { groupId, ids } of entries) next.set(groupId, ids);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [groupItemIdsByGroupId, lineItems]);

  React.useEffect(() => {
    lineItems.forEach((row, index) => {
      const itemId = /^\d+$/.test(row.item) ? Number.parseInt(row.item, 10) : null;
      const selectedGroup = /^\d+$/.test(row.group) ? Number.parseInt(row.group, 10) : null;
      if (itemId == null) return;
      const itemGroup = itemGroupById.get(itemId) ?? null;
      if (selectedGroup != null && itemGroup != null && selectedGroup !== itemGroup) {
        setValue(`line_items.${index}.item`, "", { shouldDirty: true });
        setValue(`line_items.${index}.item_name`, "", { shouldDirty: true });
        setValue(`line_items.${index}.rate`, "", { shouldDirty: true });
      }
    });
  }, [itemGroupById, lineItems, setValue]);

  React.useEffect(() => {
    if (!isEdit || !invoiceId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchInvoice(invoiceId);
        if (!cancelled) reset(invoiceToFormDefaults(row));
      } catch {
        if (!cancelled) setScreenError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, isEdit, reset, t]);

  async function submit(values: InvoiceFormValues) {
    const payload = mapInvoiceFormToPayload(values);
    setSaving(true);
    try {
      const saved =
        isEdit && invoiceId ? await updateInvoice(invoiceId, payload) : await createInvoice(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.invoices, saved.id, listBack));
    } catch (error) {
      toastApiError(error, isEdit ? t("updateError") : t("createError"));
    } finally {
      setSaving(false);
    }
  }

  function itemOptionsForGroup(groupIdRaw: string): Option[] {
    if (!/^\d+$/.test(groupIdRaw)) return itemOptions;
    const gid = Number.parseInt(groupIdRaw, 10);
    const explicit = groupItemIdsByGroupId.get(gid);
    if (explicit && explicit.size > 0) {
      return itemOptions.filter((opt) => explicit.has(Number.parseInt(opt.value, 10)));
    }
    return itemOptions.filter((opt) => (itemGroupById.get(Number.parseInt(opt.value, 10)) ?? null) === gid);
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={listBack}
        backAriaLabel={t("detail.backAria")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isEdit && invoiceId ? (
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                loading={sending}
                disabled={saving}
                onClick={async () => {
                  setSending(true);
                  try {
                    await sendInvoice(invoiceId);
                    toastSuccess(t("send.success"));
                  } catch (error) {
                    toastApiError(error, t("send.failed"));
                  } finally {
                    setSending(false);
                  }
                }}
              >
                {t("actions.send")}
              </AppButton>
            ) : null}
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(listBack)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="invoice-upsert-form" variant="primary" size="sm" loading={saving}>
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
          <form id="invoice-upsert-form" className="space-y-10 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
            <section className="space-y-6 pb-1">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.basic")}
              </h2>
              <FormFieldRow cols="2">
                <Controller
                  control={control}
                  name="client"
                  render={({ field }) => (
                    <div>
                      <CheckmarkSelect
                        id="invoice-client"
                        label={t("fields.clientName")}
                        required
                        options={clientOptions}
                        value={field.value}
                        onChange={(v) => {
                          field.onChange(v);
                          setValue("contact", "");
                        }}
                        emptyLabel={t("placeholders.client")}
                        disabled={saving}
                        invalid={!!errors.client}
                        listLabel={t("fields.clientName")}
                        portaled
                        searchable
                        onAdd={clientQuickCreate.onAdd}
                        addAriaLabel={clientQuickCreate.addAriaLabel}
                      />
                      <FieldErrorText>{errors.client?.message}</FieldErrorText>
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="contact"
                  render={({ field }) => (
                    <div>
                      <CheckmarkSelect
                        id="invoice-contact"
                        label={t("fields.contactPerson")}
                        options={contactOptions}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel={t("placeholders.contact")}
                        disabled={saving || !clientId}
                        listLabel={t("fields.contactPerson")}
                        portaled
                        searchable
                        clearable
                        onAdd={contactQuickCreate.onAdd}
                        addAriaLabel={contactQuickCreate.addAriaLabel}
                      />
                    </div>
                  )}
                />
              </FormFieldRow>
              <Controller
                control={control}
                name="project"
                render={({ field }) => (
                  <CheckmarkSelect
                    id="invoice-project"
                    label={t("fields.projectName")}
                    options={projectOptions}
                    value={field.value}
                    onChange={field.onChange}
                    emptyLabel={t("placeholders.project")}
                    disabled={saving}
                    listLabel={t("fields.projectName")}
                    portaled
                    searchable
                    clearable
                    className="h-9"
                    onAdd={projectQuickCreate.onAdd}
                    addAriaLabel={projectQuickCreate.addAriaLabel}
                  />
                )}
              />
            </section>

            <section className="space-y-6 pt-1">
              <EntityAddressesFields
                control={control}
                register={register}
                setValue={setValue}
                errors={errors}
                disabled={saving}
                idPrefix="invoice-address"
                includeGeo={false}
                labels={{
                  sectionTitle: t("fields.addresses"),
                  add: t("addresses.add"),
                  remove: t("addresses.remove"),
                  primary: t("addresses.primary"),
                  rowLabel: (index) => t("addresses.rowLabel", { index }),
                  addressType: t("fields.addressType"),
                  addressLine1: t("fields.addressLine1"),
                  addressLine2: t("fields.addressLine2"),
                  country: t("fields.country"),
                  state: t("fields.state"),
                  city: t("fields.city"),
                  pincode: t("fields.zipCode"),
                  countryPlaceholder: t("placeholders.country"),
                  statePlaceholder: t("placeholders.state"),
                  cityPlaceholder: t("placeholders.city"),
                  addressTypeBilling: t("addressType.billing"),
                  addressTypeShipping: t("addressType.shipping"),
                  addressTypeOther: t("addressType.other"),
                }}
              />
            </section>

            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.metadata")}
              </h2>
              <FormFieldRow cols="2">
                <FieldGroup label={t("fields.dueDate")} htmlFor="invoice-due">
                  <SurfaceDateInput id="invoice-due" type="date" disabled={saving} {...register("due_date")} />
                </FieldGroup>
                <Controller
                  control={control}
                  name="payment_terms"
                  render={({ field }) => (
                    <CheckmarkSelect
                      id="invoice-payment-terms"
                      label={t("fields.paymentTerms")}
                      options={paymentTermOptions}
                      value={field.value}
                      onChange={field.onChange}
                      emptyLabel={t("placeholders.paymentTerms")}
                      disabled={saving}
                      listLabel={t("fields.paymentTerms")}
                      portaled
                    />
                  )}
                />
              </FormFieldRow>
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
                  onClick={() => append(emptyInvoiceLineItem())}
                >
                  {t("lineItems.addItem")}
                </AppButton>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                      <th className="px-3 py-2">{tGroups("title")}</th>
                      <th className="px-3 py-2">
                        {tItems("title")}
                        <RequiredMark />
                      </th>
                      <th className="px-3 py-2">{t("lineItems.qty")}</th>
                      <th className="px-3 py-2">{t("lineItems.rate")}</th>
                      <th className="px-3 py-2 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const row = lineItems[index];
                      const filteredItems = itemOptionsForGroup(row?.group ?? "");
                      return (
                        <tr key={field.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 align-top">
                            <Controller
                              control={control}
                              name={`line_items.${index}.group`}
                              render={({ field: groupField }) => (
                                <CheckmarkSelect
                                  options={groupOptions}
                                  value={groupField.value}
                                  onChange={(v) => {
                                    groupField.onChange(v);
                                    setValue(`line_items.${index}.group_name`, v ? (groupLabelById.get(v) ?? "") : "", {
                                      shouldDirty: true,
                                    });
                                    setValue(`line_items.${index}.item`, "", { shouldDirty: true });
                                    setValue(`line_items.${index}.item_name`, "", { shouldDirty: true });
                                    setValue(`line_items.${index}.rate`, "", { shouldDirty: true });
                                  }}
                                  emptyLabel={t("placeholders.group")}
                                  disabled={saving}
                                  portaled
                                  searchable
                                  size="sm"
                                  clearable
                                  className="h-8"
                                  onAdd={groupQuickCreate.onAdd}
                                  addAriaLabel={groupQuickCreate.addAriaLabel}
                                />
                              )}
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="space-y-2">
                              <Controller
                                control={control}
                                name={`line_items.${index}.item`}
                                render={({ field: itemField }) => (
                                  <CheckmarkSelect
                                    options={filteredItems}
                                    value={itemField.value}
                                    invalid={!!errors.line_items?.[index]?.item}
                                    onChange={(v) => {
                                      itemField.onChange(v);
                                      setValue(
                                        `line_items.${index}.item_name`,
                                        v ? (itemLabelById.get(v) ?? "") : "",
                                        { shouldDirty: true },
                                      );
                                      if (v && /^\d+$/.test(v)) {
                                        const itemId = Number.parseInt(v, 10);
                                        const price = itemPriceById.get(itemId);
                                        const linkedGroupId = itemGroupById.get(itemId);
                                        if (linkedGroupId != null && linkedGroupId > 0) {
                                          const groupKey = String(linkedGroupId);
                                          setValue(`line_items.${index}.group`, groupKey, {
                                            shouldDirty: true,
                                          });
                                          setValue(
                                            `line_items.${index}.group_name`,
                                            groupLabelById.get(groupKey) ?? "",
                                            { shouldDirty: true },
                                          );
                                        }
                                        const currentQty = parseMoneyValue(lineItems[index]?.quantity);
                                        if (!Number.isFinite(currentQty) || currentQty <= 0) {
                                          setValue(`line_items.${index}.quantity`, "1", {
                                            shouldDirty: true,
                                          });
                                        }
                                        if (price != null && Number.isFinite(price)) {
                                          setValue(`line_items.${index}.rate`, String(price), {
                                            shouldDirty: true,
                                          });
                                        }
                                      }
                                    }}
                                    emptyLabel={t("lineItems.selectProduct")}
                                    disabled={saving}
                                    portaled
                                    searchable
                                    size="sm"
                                    className="h-8"
                                    onAdd={itemQuickCreate.onAdd}
                                    addAriaLabel={itemQuickCreate.addAriaLabel}
                                  />
                                )}
                              />
                              <FieldErrorText>{errors.line_items?.[index]?.item?.message}</FieldErrorText>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              aria-invalid={errors.line_items?.[index]?.quantity ? true : undefined}
                              className={cn(
                                surfaceInputClassName,
                                "h-8 w-24 px-2.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                errors.line_items?.[index]?.quantity && "border-red-500",
                              )}
                              disabled={saving}
                              {...register(`line_items.${index}.quantity`)}
                            />
                            <FieldErrorText>{errors.line_items?.[index]?.quantity?.message}</FieldErrorText>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              className={cn(surfaceInputClassName, "h-8 w-28 px-2.5 text-sm")}
                              readOnly
                              tabIndex={-1}
                              aria-readonly
                              {...register(`line_items.${index}.rate`)}
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
              <div className="ml-auto max-w-sm rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t("totals.totalAmount")}
                  </span>
                  <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatMoneyDisplay(totalBalance, locale)}
                  </span>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.notes")}
              </h2>
              <FormFieldRow cols="2">
                <FieldGroup label={t("fields.clientNotes")} htmlFor="invoice-client-notes">
                  <textarea
                    id="invoice-client-notes"
                    rows={3}
                    className={cn(surfaceTextareaClassName, "min-h-[80px]")}
                    disabled={saving}
                    {...register("client_notes")}
                  />
                </FieldGroup>
                <FieldGroup label={t("fields.internalNotes")} htmlFor="invoice-internal-notes">
                  <textarea
                    id="invoice-internal-notes"
                    rows={3}
                    className={cn(surfaceTextareaClassName, "min-h-[80px]")}
                    disabled={saving}
                    {...register("internal_notes")}
                  />
                </FieldGroup>
              </FormFieldRow>
            </section>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
