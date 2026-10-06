"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { cn } from "@/core/utils/http.util";
import {
  createLabourType,
  fetchLabourType,
  updateLabourType,
} from "@/features/labour-types/api/labour-type.api";
import { toCanonicalMoneyString } from "@/shared/money/format-money.util";
import { toCanonicalNumberString } from "@/shared/number/digit-grouping.util";
import {
  parseLabourNumber,
  suggestedLabourSellPrice,
} from "@/features/labour-types/utils/labour-type-numbers.util";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { hrefAfterEntityCreate, QUICK_CREATE_SELECT_TARGET_PARAM } from "@/shared/utils/quick-create-navigation.util";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { z } from "zod";
import {
  AppButton,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  FormFieldSpanFull,
  MoneyInput,
  NumericInput,
  SurfaceShell,
  surfaceInputClassName,
  surfaceTextareaClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  labourId?: number;
};

export function LabourFormScreen({ mode, labourId }: Props) {
  const t = useTranslations("Dashboard.labours");
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = useFormBackUrl("labours", routes.dashboard.labours);
  const isEdit = mode === "edit";

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [timeHours, setTimeHours] = React.useState("1");
  const [markup, setMarkup] = React.useState("0");
  const [costRate, setCostRate] = React.useState("0");
  const [sellPrice, setSellPrice] = React.useState("0");
  const [sellTouched, setSellTouched] = React.useState(false);
  const [loading, setLoading] = React.useState(isEdit);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    name?: string;
    default_time_hours?: string;
    default_markup?: string;
    default_cost_rate?: string;
    default_sell_price?: string;
  }>({});

  React.useEffect(() => {
    if (!isEdit || labourId == null) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const row = await fetchLabourType(labourId);
        if (cancelled) return;
        setName(row.name ?? "");
        setDescription(row.description ?? "");
        const hours = parseLabourNumber(row.default_time_hours);
        setTimeHours(toCanonicalNumberString(hours > 0 ? hours : 1));
        setMarkup(toCanonicalNumberString(parseLabourNumber(row.default_markup)));
        setCostRate(toCanonicalMoneyString(parseLabourNumber(row.default_cost_rate)));
        setSellPrice(toCanonicalMoneyString(parseLabourNumber(row.default_sell_price)));
        setSellTouched(true);
      } catch (error) {
        toastApiError(error, t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, labourId, t]);

  function syncSellFromCostMarkup(nextCost: string, nextMarkup: string) {
    if (sellTouched) return;
    const cost = parseLabourNumber(nextCost);
    const mk = parseLabourNumber(nextMarkup);
    setSellPrice(String(suggestedLabourSellPrice(cost, mk)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const schema = z.object({
      name: zTrimmedNonEmpty(t("validation.name")),
      default_time_hours: z
        .string()
        .refine((v) => Number.isFinite(parseLabourNumber(v)) && parseLabourNumber(v) >= 0, t("validation.timeHours")),
      default_markup: z
        .string()
        .refine((v) => Number.isFinite(parseLabourNumber(v)) && parseLabourNumber(v) >= 0, t("validation.markup")),
      default_cost_rate: z
        .string()
        .refine((v) => Number.isFinite(parseLabourNumber(v)) && parseLabourNumber(v) >= 0, t("validation.costRate")),
      default_sell_price: z
        .string()
        .refine((v) => Number.isFinite(parseLabourNumber(v)) && parseLabourNumber(v) >= 0, t("validation.sellPrice")),
    });
    const parsed = schema.safeParse({
      name,
      default_time_hours: timeHours,
      default_markup: markup,
      default_cost_rate: costRate,
      default_sell_price: sellPrice,
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (
          key === "name" ||
          key === "default_time_hours" ||
          key === "default_markup" ||
          key === "default_cost_rate" ||
          key === "default_sell_price"
        ) {
          next[key] = String(issue.message);
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const hours = parseLabourNumber(parsed.data.default_time_hours);
    const payload = {
      name: parsed.data.name,
      description: description.trim(),
      default_time_hours: hours,
      default_markup: parseLabourNumber(parsed.data.default_markup),
      default_cost_rate: parseLabourNumber(parsed.data.default_cost_rate),
      default_sell_price: parseLabourNumber(parsed.data.default_sell_price),
    };
    try {
      const saved =
        isEdit && labourId != null
          ? await updateLabourType(labourId, payload)
          : await createLabourType(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(
        hrefAfterEntityCreate({
          createdId: saved.id,
          selectTarget: isEdit ? null : searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM),
          backHref: safeBack,
          listPath: routes.dashboard.labours,
        }),
      );
    } catch (error) {
      reportLocalFormSubmitApiError(
        error,
        (fieldErrors) => setErrors((prev) => ({ ...prev, ...fieldErrors })),
        t("saveError"),
        {
          fieldMap: {
            Name: "name",
            name: "name",
            default_time_hours: "default_time_hours",
            default_markup: "default_markup",
            default_cost_rate: "default_cost_rate",
            default_sell_price: "default_sell_price",
          },
          knownFormKeys: [
            "name",
            "default_time_hours",
            "default_markup",
            "default_cost_rate",
            "default_sell_price",
          ],
        },
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={submitting}
              onClick={() => router.push(safeBack ?? routes.dashboard.labours)}
            >
              {t("cancel")}
            </AppButton>
            <AppButton type="submit" form="labour-form-screen" variant="primary" size="sm" loading={submitting}>
              {isEdit ? t("saveChanges") : t("save")}
            </AppButton>
          </div>
        }
      />
      <SurfaceShell className="p-4 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <form id="labour-form-screen" className="space-y-6" noValidate onSubmit={(e) => void onSubmit(e)}>
            <FormFieldRow cols="2">
              <FieldGroup label={t("fields.name")} htmlFor="labour-name" required>
                <input
                  id="labour-name"
                  className={cn(surfaceInputClassName, errors.name && "border-red-500")}
                  value={name}
                  onChange={(e) => {
                    setName(sanitizeTitleInput(e.target.value));
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder={t("fields.namePlaceholder")}
                  disabled={submitting}
                />
                <FieldErrorText>{errors.name}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={t("fields.timeHours")} htmlFor="labour-time" required>
                <NumericInput
                  id="labour-time"
                  value={timeHours}
                  maxDecimals={2}
                  trimTrailingZeros
                  onChange={(next) => {
                    setTimeHours(next);
                    if (errors.default_time_hours) {
                      setErrors((prev) => ({ ...prev, default_time_hours: undefined }));
                    }
                  }}
                  disabled={submitting}
                  invalid={!!errors.default_time_hours}
                  placeholder={t("fields.timeHoursPlaceholder")}
                />
                <FieldErrorText>{errors.default_time_hours}</FieldErrorText>
              </FieldGroup>
            </FormFieldRow>

            <FormFieldRow cols="2">
              <FieldGroup label={t("fields.costRate")} htmlFor="labour-cost" required>
                <MoneyInput
                  id="labour-cost"
                  value={costRate}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCostRate(next);
                    syncSellFromCostMarkup(next, markup);
                    if (errors.default_cost_rate) {
                      setErrors((prev) => ({ ...prev, default_cost_rate: undefined }));
                    }
                  }}
                  disabled={submitting}
                  invalid={!!errors.default_cost_rate}
                />
                <FieldErrorText>{errors.default_cost_rate}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={t("fields.sellPrice")} htmlFor="labour-sell" required>
                <MoneyInput
                  id="labour-sell"
                  value={sellPrice}
                  onChange={(e) => {
                    setSellTouched(true);
                    setSellPrice(e.target.value);
                    if (errors.default_sell_price) {
                      setErrors((prev) => ({ ...prev, default_sell_price: undefined }));
                    }
                  }}
                  disabled={submitting}
                  invalid={!!errors.default_sell_price}
                />
                <FieldErrorText>{errors.default_sell_price}</FieldErrorText>
              </FieldGroup>
            </FormFieldRow>

            <FormFieldRow cols="1">
              <FieldGroup label={t("fields.markup")} htmlFor="labour-markup" required>
                <NumericInput
                  id="labour-markup"
                  value={markup}
                  maxDecimals={2}
                  trimTrailingZeros
                  onChange={(next) => {
                    setMarkup(next);
                    syncSellFromCostMarkup(costRate, next);
                    if (errors.default_markup) {
                      setErrors((prev) => ({ ...prev, default_markup: undefined }));
                    }
                  }}
                  disabled={submitting}
                  invalid={!!errors.default_markup}
                />
                <FieldErrorText>{errors.default_markup}</FieldErrorText>
              </FieldGroup>
            </FormFieldRow>

            <FormFieldRow cols="1">
              <FormFieldSpanFull>
                <FieldGroup label={t("fields.description")} htmlFor="labour-description">
                  <textarea
                    id="labour-description"
                    rows={3}
                    className={surfaceTextareaClassName}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("fields.descriptionPlaceholder")}
                    disabled={submitting}
                  />
                </FieldGroup>
              </FormFieldSpanFull>
            </FormFieldRow>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
