"use client";

import { useTranslations } from "next-intl";
import type { Control, FieldErrors } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import type { UserFormValues } from "@/features/users/schemas/user-form-schema";
import { USER_AVAILABILITY_DAYS } from "@/features/users/types/user-availability.types";
import { FieldErrorText, surfaceInputClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  control: Control<UserFormValues>;
  errors: FieldErrors<UserFormValues>;
  disabled?: boolean;
};

export function UserAvailabilityFields({ control, errors, disabled }: Props) {
  const t = useTranslations("Dashboard.users");
  const availableDays = useWatch({ control, name: "available_days" }) ?? [];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t("fields.availableDays")}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("fields.availableDaysHint")}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2.5">{t("availability.day")}</th>
              <th className="px-3 py-2.5">{t("availability.available")}</th>
              <th className="px-3 py-2.5">{t("availability.from")}</th>
              <th className="px-3 py-2.5">{t("availability.to")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {USER_AVAILABILITY_DAYS.map((day, index) => {
              const rowEnabled = Boolean(availableDays[index]?.enabled);
              const timesDisabled = disabled || !rowEnabled;
              return (
              <tr
                key={day}
                className={cn(!rowEnabled && "bg-slate-50/80 dark:bg-slate-900/40")}
              >
                <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                  {t(`availability.days.${day}`)}
                </td>
                <td className="px-3 py-2.5">
                  <Controller
                    control={control}
                    name={`available_days.${index}.enabled`}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        checked={Boolean(field.value)}
                        disabled={disabled}
                        className="size-4 rounded border-slate-300"
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    )}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <Controller
                    control={control}
                    name={`available_days.${index}.start_time`}
                    render={({ field }) => (
                      <input
                        type="time"
                        value={field.value}
                        disabled={timesDisabled}
                        aria-label={t("availability.from")}
                        className={cn(
                          surfaceInputClassName,
                          "min-w-[7.5rem]",
                          timesDisabled && "cursor-not-allowed opacity-50",
                        )}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <Controller
                    control={control}
                    name={`available_days.${index}.end_time`}
                    render={({ field }) => (
                      <input
                        type="time"
                        value={field.value}
                        disabled={timesDisabled}
                        aria-label={t("availability.to")}
                        className={cn(
                          surfaceInputClassName,
                          "min-w-[7.5rem]",
                          timesDisabled && "cursor-not-allowed opacity-50",
                        )}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      <FieldErrorText>{errors.available_days?.message as string | undefined}</FieldErrorText>
    </div>
  );
}
