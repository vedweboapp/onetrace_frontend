"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ListEmptyStateKind } from "@/shared/hooks/use-list-active-inactive-empty";
import { cn } from "@/core/utils/http.util";
import { AppButton } from "./app-button";
import { DashboardEmptyState, type DashboardEmptyStateIconName } from "./dashboard-empty-state";

export type ListPageOnboardingEmptyProps = {
  iconName?: DashboardEmptyStateIconName;
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
};

export type ListPageEmptyStatesProps = {
  emptyStateKind: ListEmptyStateKind;
  onboarding: ListPageOnboardingEmptyProps;
  onClearFilters: () => void;
  onSwitchToInactive?: () => void;
  compact?: boolean;
  /** Fill tab/detail pane height (detail list tabs). */
  fill?: boolean;
};

export function listPageSurfaceShellClassName(hideListChrome: boolean): string {
  return cn(
    // Fill remaining viewport: table body scrolls; pagination stays pinned at the foot.
    "flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950",
    hideListChrome
      ? "rounded-none border-dashed"
      : "rounded-none border border-slate-200 shadow-none ring-0 dark:border-slate-800",
  );
}

/** Root wrapper for list panels — fills the shell; only the table body scrolls. */
export function listPageRootClassName(): string {
  return cn(
    // `dashboard-list-page` marks fill height for DashboardPageScrollHost
    // (no outer page scroll / no empty strip when the sidebar collapses).
    "dashboard-list-page flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3",
  );
}

/** Scrollable card grid area inside list shells (pagination stays pinned below). */
export function listPageCardScrollClassName(): string {
  return "min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8";
}

/** Scrollable pages (forms) — parent shell already scrolls; keep bottom padding. */
export function dashboardScrollablePageClassName(): string {
  return "min-h-0 w-full pb-8";
}

/** Shared empty states for dashboard list panels and detail tabs. */
export function ListPageEmptyStates({
  emptyStateKind,
  onboarding,
  onClearFilters,
  onSwitchToInactive,
  compact = false,
  /** Prefer fill so empty states center in the remaining shell height. */
  fill = true,
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
        compact={compact || Boolean(onboarding.compact)}
        fill={compact || onboarding.compact ? false : fill}
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
        fill={compact ? false : fill}
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
      fill={compact ? false : fill}
    />
  );
}
