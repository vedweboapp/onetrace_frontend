"use client";

import * as React from "react";
import { fetchFormRenderRulesByProjectForm, type FormRenderRuleItem } from "@/features/rules/api/rule.api";

function SeverityBadge({ value }: { value?: string | null }) {
  const text = value ?? "";
  const color =
    text.includes("SERIOUS") || text.includes("HIGH")
      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      : text.includes("MODERATE") || text.includes("MEDIUM")
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {text || "—"}
    </span>
  );
}

function RuleCard({ rule }: { rule: FormRenderRuleItem }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-sm font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            {rule.section_code}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              {rule.section_label}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Order: {rule.display_order}
            </p>
          </div>
        </div>
        <SeverityBadge value={rule.default_severity} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Trigger Condition */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Trigger Condition
          </p>
          {rule.trigger_condition ? (
            <div className="rounded-md bg-blue-50/60 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50 px-3 py-2 text-xs space-y-0.5">
              <p className="font-mono text-blue-700 dark:text-blue-300 break-all">
                {rule.trigger_condition.field}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold">{rule.trigger_condition.operator}</span>{" "}
                &ldquo;{rule.trigger_condition.value}&rdquo;
              </p>
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Always active</span>
          )}
        </div>

        {/* Category & Timescale */}
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Category
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300">{rule.default_category}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Timescale
            </p>
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {rule.default_timescale}
            </span>
          </div>
        </div>

        {/* Action Fields */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Action Fields
          </p>
          <div className="flex flex-wrap gap-1">
            {(rule.action_api_names ?? []).map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RuleDetailPanel({ projectFormId, formName }: { projectFormId: string | number; formName?: string }) {
  const [rules, setRules] = React.useState<FormRenderRuleItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await fetchFormRenderRulesByProjectForm(projectFormId);
        if (!cancelled) setRules(Array.isArray(items) ? items : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load rules.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectFormId]);

  return (
    <div className="p-6 space-y-5">
      {/* Stats bar */}
      {!loading && !error && rules.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Rules</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{rules.length}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Conditional</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {rules.filter((r) => r.trigger_condition !== null).length}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Always Active</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {rules.filter((r) => r.trigger_condition === null).length}
            </p>
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No rules found for this form.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <RuleCard key={rule.id ?? `${rule.section_code}-${index}`} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}
