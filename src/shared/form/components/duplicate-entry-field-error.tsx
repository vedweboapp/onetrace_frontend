"use client";

import { useTranslations } from "next-intl";
import type { DuplicateEntryConflict } from "@/shared/form/duplicate-entry.util";
import { FieldErrorText } from "@/shared/ui/field-primitives";

type Props = {
  id?: string;
  message?: string | null;
  fieldKey: string;
  conflict: DuplicateEntryConflict | null;
  /** Detail page for the existing record; opens in a new tab. */
  existingHref?: string | null;
};

/** Field error that adds a blue “View” link for DUPLICATE_ENTRY conflicts. */
export function DuplicateEntryFieldError({
  id,
  message,
  fieldKey,
  conflict,
  existingHref,
}: Props) {
  const t = useTranslations("Dashboard.common.duplicateEntry");
  if (!message) return null;

  const showLink =
    conflict != null
    && Boolean(existingHref)
    && (conflict.fieldKeys.length === 0 || conflict.fieldKeys.includes(fieldKey));

  return (
    <FieldErrorText id={id}>
      <span className="inline">
        {message}
        {showLink && existingHref ? (
          <>
            {" "}
            <a
              href={existingHref}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={(e) => e.stopPropagation()}
            >
              {t("viewExisting")}
            </a>
          </>
        ) : null}
      </span>
    </FieldErrorText>
  );
}
