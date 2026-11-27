"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import {
  createFormRenderRule,
  fetchProjectFormMetadata,
  fetchProjectFormOptions,
  type FormMetadataSection,
  type ProjectFormOption,
} from "@/features/rules/api/rule.api";
import {
  RuleBlockCard,
  makeBlock,
  type RuleBlock,
} from "@/features/rules/components/rule-block-card";
import { routes } from "@/shared/config/routes";
import { AppButton } from "@/shared/ui";

export function RuleCreatePanel({ projectFormId }: { projectFormId: string }) {
  const router = useRouter();

  const [projectForms, setProjectForms] = React.useState<ProjectFormOption[]>([]);
  const [sections, setSections] = React.useState<FormMetadataSection[]>([]);
  const [loadingMetadata, setLoadingMetadata] = React.useState(false);
  const [blocks, setBlocks] = React.useState<RuleBlock[]>([makeBlock()]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void fetchProjectFormOptions().then(setProjectForms).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!projectFormId) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoadingMetadata(true);
        setError(null);
        const meta = await fetchProjectFormMetadata(projectFormId);
        if (!cancelled) {
          setSections(meta);
          // Auto-select first section for the initial block
          if (meta.length > 0) {
            setBlocks([makeBlock({ selectedSectionCode: meta[0].code })]);
          }
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load form metadata.");
      } finally {
        if (!cancelled) setLoadingMetadata(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectFormId]);

  const updateBlock = (index: number, patch: Partial<RuleBlock>) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const addBlock = () => {
    const used = new Set(blocks.map((b) => b.selectedSectionCode).filter(Boolean));
    const nextSection = sections.find((s) => !used.has(s.code));
    if (sections.length > 0 && !nextSection) return;
    setBlocks((prev) => [
      ...prev,
      makeBlock({ selectedSectionCode: nextSection?.code ?? "" }),
    ]);
  };

  const hasUnusedSections =
    sections.length === 0 ||
    sections.some((s) => !blocks.some((b) => b.selectedSectionCode === s.code));

  const selectedFormName = projectForms.find((f) => String(f.id) === projectFormId)?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b.selectedSectionCode) {
        setError(`Block ${i + 1}: please select a section.`);
        return;
      }
      if (b.actionApiNames.length === 0) {
        setError(`Block ${i + 1}: please select at least one action field.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      // Find section info from metadata
      await Promise.all(
        blocks.map((block, index) => {
          const sec = sections.find((s) => s.code === block.selectedSectionCode);
          return createFormRenderRule({
            project_form: Number(projectFormId),
            dynamic_form: null,
            section_code: `c${index + 1}`,
            section_label: sec?.label ?? block.selectedSectionCode,
            display_order: index + 1,
            action_api_names: block.actionApiNames,
            trigger_condition:
              block.hasTrigger && block.triggerField.trim()
                ? { field: block.triggerField.trim(), operator: block.triggerOperator, value: block.triggerValue }
                : null,
            missing_data_behavior: block.missingDataBehavior,
            default_category: block.defaultCategory.trim(),
            default_timescale: block.defaultTimescale,
            default_severity: block.defaultSeverity,
            action_delimiter: ":",
            ignore_values: block.ignoreValuesText.split(",").map((v) => v.trim()),
          });
        }),
      );

      router.push(routes.dashboard.settingsRulesDetail(projectFormId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rules.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <DetailPageHeader
        title="Create Render Rules"
        subtitle={
          <>
            Form: {selectedFormName ?? `#${projectFormId}`}
            {loadingMetadata && " · Loading metadata..."}
          </>
        }
        backHref={routes.dashboard.settingsRules}
        backAriaLabel="Back to rules"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rule blocks */}
        {blocks.map((block, index) => {
          const usedByOthers = new Set(
            blocks
              .filter((_, i) => i !== index)
              .map((b) => b.selectedSectionCode)
              .filter(Boolean),
          );
          return (
            <RuleBlockCard
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              sections={sections}
              usedSectionCodes={usedByOthers}
              onChange={(patch) => updateBlock(index, patch)}
              onRemove={() => removeBlock(index)}
            />
          );
        })}

        {/* Add Block */}
        {hasUnusedSections && (
          <button
            type="button"
            onClick={addBlock}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            <Plus className="h-4 w-4" />
            Add Block
          </button>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => router.push(routes.dashboard.settingsRules)}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={submitting}>
            {submitting
              ? "Creating..."
              : blocks.length > 1
              ? `Create ${blocks.length} Rules`
              : "Create Rule"}
          </AppButton>
        </div>
      </form>
    </div>
  );
}
