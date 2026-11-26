import { RuleDetailPanel } from "@/features/rules/components/rule-detail-panel";

export default async function SettingsRulesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RuleDetailPanel projectFormId={id} />;
}
