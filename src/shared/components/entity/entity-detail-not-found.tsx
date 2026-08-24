"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AppButton, DashboardEmptyState } from "@/shared/ui";

type Props = {
  backHref: string;
  title?: string;
  description?: string;
  backLabel?: string;
  /** Center in the tab pane and fill available height. */
  fill?: boolean;
};

/** Record missing / deleted — used on entity detail pages when the API returns 404. */
export function EntityDetailNotFoundState({
  backHref,
  title,
  description,
  backLabel,
  fill = true,
}: Props) {
  const t = useTranslations("Dashboard.common.detail");
  const router = useRouter();

  return (
    <DashboardEmptyState
      iconName="notFound"
      title={title ?? t("recordNotFoundTitle")}
      description={description ?? t("recordNotFoundDescription")}
      fill={fill}
      action={
        <AppButton type="button" variant="secondary" size="sm" onClick={() => router.push(backHref)}>
          {backLabel ?? t("backToList")}
        </AppButton>
      }
    />
  );
}
