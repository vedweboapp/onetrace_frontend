"use client";

import { useTranslations } from "next-intl";
import type { DuplicateEntryConflict } from "@/shared/form/duplicate-entry.util";
import { FieldErrorText } from "@/shared/ui/field-primitives";

type Props = {
  id?: string;
  message?: string | null;
  fieldKey: string;
  conflict: DuplicateEntryConflict | null;
  onViewExisting: () => void;
};

/** Field error that adds a “View existing” link for DUPLICATE_ENTRY conflicts. */
export function DuplicateEntryFieldError({
  id,
  message,
  fieldKey,
  conflict,
  onViewExisting,
}: Props) {
  const t = useTranslations("Dashboard.common.duplicateEntry");
  if (!message) return null;

  const showLink =
    conflict != null
    && (conflict.fieldKeys.length === 0 || conflict.fieldKeys.includes(fieldKey));

  return (
    <FieldErrorText id={id}>
      <span className="inline">
        {message}
        {showLink ? (
          <>
            {" "}
            <button
              type="button"
              className="font-semibold underline underline-offset-2 hover:text-red-700 dark:hover:text-red-300"
              onClick={onViewExisting}
            >
              {t("viewExisting")}
            </button>
          </>
        ) : null}
      </span>
    </FieldErrorText>
  );
}
