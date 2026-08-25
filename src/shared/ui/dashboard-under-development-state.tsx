import { DashboardEmptyState } from "@/shared/ui/dashboard-empty-state";

type DashboardUnderDevelopmentStateProps = {
  title: string;
  description: string;
  className?: string;
  /**
   * When false, only fill the parent (parent already has viewport height).
   * Default true for standalone pages like Home.
   */
  viewportFill?: boolean;
};

/**
 * Full-panel “coming soon” state — same visual language as empty / not-found
 * (icon badge, title, description) and fills available shell height.
 */
export function DashboardUnderDevelopmentState({
  title,
  description,
  className,
  viewportFill = true,
}: DashboardUnderDevelopmentStateProps) {
  return (
    <DashboardEmptyState
      iconName="underDevelopment"
      title={title}
      description={description}
      fill
      viewportFill={viewportFill}
      className={className}
    />
  );
}
