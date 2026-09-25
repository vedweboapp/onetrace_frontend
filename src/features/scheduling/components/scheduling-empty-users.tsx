"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  onClear?: () => void;
};

export function SchedulingEmptyUsers({ onClear }: Props) {
  const t = useTranslations("Dashboard.scheduling");
  return (
    <div className="flex min-h-[16rem] flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Users className="size-6" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{t("emptyUsers")}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t("emptyUsersHint")}
      </p>
      {onClear ? (
        <button
          type="button"
          className="mt-4 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300"
          onClick={onClear}
        >
          {t("clearPeopleFilters")}
        </button>
      ) : null}
    </div>
  );
}
