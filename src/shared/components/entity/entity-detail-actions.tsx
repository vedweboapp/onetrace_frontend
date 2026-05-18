"use client";

import { Pencil } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { AppButton } from "@/shared/ui";

type EditButtonProps = {
  label: string;
  listBack: string;
  fallbackRoute: string;
  className?: string;
};

/** Primary edit action shared across entity detail headers. */
export function EntityDetailEditButton({ label, listBack, fallbackRoute, className }: EditButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <AppButton
      type="button"
      variant="primary"
      size="sm"
      className={className ?? "gap-2"}
      onClick={() =>
        router.push(`${pathname}/edit?back=${encodeURIComponent(listBack || fallbackRoute)}`)
      }
    >
      <Pencil className="size-4" strokeWidth={2} aria-hidden />
      {label}
    </AppButton>
  );
}

type DeleteEditActionsProps = EditButtonProps & {
  deleteLabel: string;
  onDelete: () => void;
};

/** Delete + edit action group for entities that support deletion from detail. */
export function EntityDetailDeleteEditActions({
  deleteLabel,
  onDelete,
  label,
  listBack,
  fallbackRoute,
}: DeleteEditActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <AppButton type="button" variant="secondary" size="sm" onClick={onDelete}>
        {deleteLabel}
      </AppButton>
      <EntityDetailEditButton label={label} listBack={listBack} fallbackRoute={fallbackRoute} />
    </div>
  );
}
