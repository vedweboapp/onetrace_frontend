"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useDashboardActions } from "@/shared/ui/dashboard-action-buttons";
import { DeleteButton, EditButton } from "@/shared/ui/dashboard-action-buttons";

type EditButtonProps = {
  /** Defaults to shared “Edit”. */
  label?: string;
  listBack: string;
  fallbackRoute: string;
  className?: string;
};

export function EntityDetailEditButton({ label, listBack, fallbackRoute, className }: EditButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useDashboardActions();

  return (
    <EditButton
      className={className}
      onClick={() =>
        router.push(`${pathname}/edit?back=${encodeURIComponent(listBack || fallbackRoute)}`)
      }
    >
      {label ?? t("edit")}
    </EditButton>
  );
}

type DeleteEditActionsProps = EditButtonProps & {
  deleteLabel?: string;
  onDelete: () => void;
};

export function EntityDetailDeleteEditActions({
  deleteLabel,
  onDelete,
  label,
  listBack,
  fallbackRoute,
  className,
}: DeleteEditActionsProps) {
  const t = useDashboardActions();

  return (
    <div className="flex flex-wrap gap-2">
      <DeleteButton onClick={onDelete}>{deleteLabel ?? t("delete")}</DeleteButton>
      <EntityDetailEditButton
        label={label}
        listBack={listBack}
        fallbackRoute={fallbackRoute}
        className={className}
      />
    </div>
  );
}
