"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import {
  fetchFormRenderRules,
  fetchProjectFormOptions,
  type FormRenderRuleSummary,
  type ProjectFormOption,
} from "@/features/rules/api/rule.api";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { AppButton, AppModal, ListPageSearchField, SurfaceShell } from "@/shared/ui";
import { routes } from "@/shared/config/routes";

function ProjectFormPickerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [forms, setForms] = React.useState<ProjectFormOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setSelectedId("");
    setSearch("");
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await fetchProjectFormOptions();
        if (!cancelled) setForms(list);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load project forms.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return forms;
    return forms.filter(
      (f) => f.name.toLowerCase().includes(q) || String(f.id).includes(q),
    );
  }, [forms, search]);

  const handleContinue = () => {
    if (!selectedId) return;
    onClose();
    router.push(routes.dashboard.settingsRulesCreate(selectedId));
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Select Project Form"
      description="Choose a project form to create a render rule for."
      size="sm"
      closeOnBackdrop
      footer={
        <div className="flex justify-end gap-3">
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="button" disabled={!selectedId} onClick={handleContinue}>
            Continue
          </AppButton>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Search */}
        <ListPageSearchField
          value={search}
          onCommit={setSearch}
          placeholder="Search forms by name..."
          ariaLabel="Search project forms"
        />

        {/* List */}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No project forms found.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1 pr-0.5">
            {filtered.map((form) => {
              const isSelected = selectedId === String(form.id);
              return (
                <button
                  key={form.id}
                  type="button"
                  onClick={() => setSelectedId(String(form.id))}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                  }`}
                >
                  {/* Radio indicator */}
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span
                    className={`font-medium ${
                      isSelected
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {form.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppModal>
  );
}

export function RulesPanel() {
  const router = useRouter();
  const [rules, setRules] = React.useState<FormRenderRuleSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const loadRules = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await fetchFormRenderRules();
      setRules(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const filteredRules = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter(
      (r) =>
        r.form_name.toLowerCase().includes(q) ||
        r.form_type.toLowerCase().includes(q) ||
        String(r.form_id).includes(q),
    );
  }, [rules, search]);

  const columns = React.useMemo(() => {
    const col = entityCol<FormRenderRuleSummary>();
    return [
      col.custom("form_name", "Form Name", (row) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{row.form_name}</span>
      )),
      col.custom("form_type", "Form Type", (row) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {row.form_type}
        </span>
      )),
      col.custom("totalcount_rules", "Total Rules", (row) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
          {row.totalcount_rules}
        </span>
      )),
      col.custom("last_updated_at", "Last Updated", (row) => (
        <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
          {row.last_updated_at ? new Date(row.last_updated_at).toLocaleString() : "—"}
        </span>
      )),
    ];
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <ListPageSearchField
          value={search}
          onCommit={setSearch}
          placeholder="Search rules..."
          ariaLabel="Search rules"
        />
        <AppButton type="button" onClick={() => setPickerOpen(true)}>
          + Create Rule
        </AppButton>
      </div>

      <SurfaceShell className="rounded-none">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-2 p-6">
            <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No rules found.
          </div>
        ) : (
          <EntityDataTable
            rows={filteredRules}
            columns={columns}
            onRowClick={(row) =>
              router.push(routes.dashboard.settingsRulesDetail(row.project_form ?? row.form_id))
            }
          />
        )}
      </SurfaceShell>

      <ProjectFormPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
