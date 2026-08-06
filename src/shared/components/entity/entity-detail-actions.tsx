"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { buildCurrentPageBackHref, buildEntityEditHrefFromDetail, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { useDashboardActions } from "@/shared/ui/dashboard-action-buttons";
import { DeleteButton, EditButton } from "@/shared/ui/dashboard-action-buttons";

type EditButtonProps = {
  /** Defaults to shared “Edit”. */
  label?: string;
  /** @deprecated Edit back uses the current detail page; kept for call-site compatibility. */
  listBack?: string;
  /** @deprecated Edit back uses the current detail page; kept for call-site compatibility. */
  fallbackRoute?: string;
  className?: string;
};

export function EntityDetailEditButton({ label, className }: EditButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useDashboardActions();
  const detailBackHref = buildCurrentPageBackHref(pathname, searchParams);

  return (
    <EditButton
      className={className}
      onClick={() =>
        router.push(
          buildPathWithStoredBack(buildEntityEditHrefFromDetail(pathname, searchParams), detailBackHref),
        )
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
