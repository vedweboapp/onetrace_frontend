import { redirect } from "next/navigation";
import { RuleCreatePanel } from "@/features/rules/components/rule-create-panel";
import { routes } from "@/shared/config/routes";

export default async function SettingsRulesCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ project_form?: string }>;
}) {
  const { project_form } = await searchParams;

  // If no project_form in URL, bounce back to rules list
  // (the picker modal on that page will re-open)
  if (!project_form) {
    redirect(routes.dashboard.settingsRules);
  }

  return <RuleCreatePanel projectFormId={project_form} />;
}
