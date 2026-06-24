"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ListEmptyStateKind } from "@/shared/hooks/use-list-active-inactive-empty";
import { AppButton } from "./app-button";
import { DashboardEmptyState, type DashboardEmptyStateIconName } from "./dashboard-empty-state";

export type ListPageOnboardingEmptyProps = {
  iconName?: DashboardEmptyStateIconName;
  icon?: LucideIcon;
  title: string;
  description: string;
  action: React.ReactNode;
  compact?: boolean;
};

export type ListPageEmptyStatesProps = {
  emptyStateKind: ListEmptyStateKind;
  onboarding: ListPageOnboardingEmptyProps;
  onClearFilters: () => void;
  onSwitchToInactive?: () => void;
  compact?: boolean;
};

export function listPageSurfaceShellClassName(hideListChrome: boolean): string {
  return hideListChrome ? "rounded-none border-dashed" : "rounded-none";
}

/** Shared empty states for dashboard list panels (matches Clients behaviour). */
export function ListPageEmptyStates({
  emptyStateKind,
  onboarding,
  onClearFilters,
  onSwitchToInactive,
  compact = false,
}: ListPageEmptyStatesProps) {
  const tList = useTranslations("Dashboard.list");

  if (emptyStateKind === "none") return null;

  if (emptyStateKind === "onboarding") {
    return (
      <DashboardEmptyState
        iconName={onboarding.iconName}
        icon={onboarding.icon}
        title={onboarding.title}
        description={onboarding.description}
        action={onboarding.action}
        compact={onboarding.compact ?? compact}
      />
    );
  }

  if (emptyStateKind === "activeOnly" && onSwitchToInactive) {
    return (
      <DashboardEmptyState
        iconName="noResults"
        title={tList("noActiveResultsTitle")}
        description={tList("noActiveResultsDescription")}
        action={
          <AppButton type="button" variant="secondary" size="sm" onClick={onSwitchToInactive}>
            {tList("viewInactive")}
          </AppButton>
        }
        compact={compact}
      />
    );
  }

  return (
    <DashboardEmptyState
      iconName="noResults"
      title={tList("noResultsTitle")}
      description={tList("noResultsDescription")}
      action={
        <AppButton type="button" variant="secondary" size="sm" onClick={onClearFilters}>
          {tList("clearFilters")}
        </AppButton>
      }
      compact={compact}
    />
  );
}
