"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  MoreVertical,
  Clock,
  Star,
  Loader2,
} from "lucide-react";
import type { Template, TemplateCategory } from "../types/template.types";
import { routes } from "@/shared/config/routes";
import {
  AppButton,
  AppTabs,
  type AppTabItem,
  ListPageSearchField,
  listPageRootClassName,
} from "@/shared/ui";
import { getTemplates, deleteTemplate } from "../api/template.api";

// ─── Mock data (replace with API calls) ──────────────────────────────────────
const MOCK_TEMPLATES: Template[] = [
  {
    id: "1",
    name: "Project Report",
    description: "A professional project status report with sections for summary, progress, and next steps.",
    content: "<h1>Project Report</h1><p>Summary goes here...</p>",
    category: "report",
    created_at: "2026-09-15T10:00:00Z",
    updated_at: "2026-09-20T12:30:00Z",
    is_default: true,
  },
  {
    id: "2",
    name: "Service Invoice",
    description: "Clean invoice template with itemised billing, tax, and payment terms.",
    content: "<h1>Invoice</h1><p>Bill to:</p>",
    category: "invoice",
    created_at: "2026-09-10T09:00:00Z",
    updated_at: "2026-09-10T09:00:00Z",
  },
  {
    id: "3",
    name: "Job Completion Letter",
    description: "Formal letter confirming job completion, sent to clients.",
    content: "<h1>Job Completion</h1><p>Dear Client,</p>",
    category: "letter",
    created_at: "2026-08-28T14:00:00Z",
    updated_at: "2026-08-28T14:00:00Z",
  },
  {
    id: "4",
    name: "Service Contract",
    description: "Standard service agreement with terms, scope, and signature fields.",
    content: "<h1>Service Contract</h1>",
    category: "contract",
    created_at: "2026-08-01T11:00:00Z",
    updated_at: "2026-09-01T11:00:00Z",
  },
];

const CATEGORY_TABS: AppTabItem[] = [
  { id: "all", label: "All Templates" },
  { id: "report", label: "Reports" },
  { id: "invoice", label: "Invoices" },
  { id: "letter", label: "Letters" },
  { id: "contract", label: "Contracts" },
  { id: "custom", label: "Custom" },
];

const CATEGORY_COLORS: Record<string, string> = {
  report: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  invoice: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  letter: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  contract: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  custom: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: Template;
  onEdit: (t: Template) => void;
  onDelete: (t: Template) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const formattedDate = template.updated_at
    ? new Date(template.updated_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const categoryColor =
    CATEGORY_COLORS[template.category ?? "custom"] ?? CATEGORY_COLORS.custom;

  // Generate a mini text preview from HTML content
  const textPreview = template.content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return (
    <div
      className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer"
      onClick={() => onEdit(template)}
    >
      {/* Document thumbnail */}
      <div className="relative h-44 bg-gradient-to-b from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center justify-start p-4 overflow-hidden">
        {/* A4-like mini page */}
        <div className="w-full max-w-[140px] h-full bg-white dark:bg-slate-950 shadow-sm border border-slate-200 dark:border-slate-750 rounded-sm p-2 text-[7px] leading-[1.4] text-slate-600 dark:text-slate-400 overflow-hidden select-none">
          <div className="font-bold text-[8px] text-slate-800 dark:text-slate-200 mb-1 truncate">
            {template.name}
          </div>
          <div className="text-slate-400 dark:text-slate-600 mb-1.5">
            {"─".repeat(28)}
          </div>
          <p className="line-clamp-6 break-words">{textPreview || "Empty template"}</p>
        </div>

        {template.is_default && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
            <Star size={9} fill="currentColor" />
            Default
          </div>
        )}

        {/* Hover overlay with open button */}
        <div className="absolute inset-0 bg-slate-900/10 dark:bg-white/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
            Open Template
          </span>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight line-clamp-1">
            {template.name}
          </p>

          {/* Actions menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="p-1 rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all"
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit(template);
                  }}
                >
                  <Pencil size={12} /> Edit template
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete(template);
                  }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {template.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-1">
          {template.category && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColor} capitalize`}>
              {template.category}
            </span>
          )}
          <div className="flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
            <Clock size={10} />
            {formattedDate}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Template Card ────────────────────────────────────────────────────────
function NewTemplateCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 h-full min-h-[260px] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 dark:text-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all duration-200 group cursor-pointer"
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:scale-105 flex items-center justify-center transition-all">
        <Plus size={22} className="text-slate-500 dark:text-slate-400" />
      </div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Create new template</span>
    </button>
  );
}

// ─── Main listing component ───────────────────────────────────────────────────
export default function TemplatesListing() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("all");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filtered = templates.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleEdit = (t: Template) => {
    router.push(`${routes.dashboard.settingsTemplates}/${t.id}/edit`);
  };

  const handleDelete = async (t: Template) => {
    if (window.confirm(`Delete "${t.name}"?`)) {
      await deleteTemplate(t.id);
      await loadTemplates();
    }
  };

  const handleCreate = () => {
    router.push(`${routes.dashboard.settingsTemplates}/create`);
  };

  return (
    <div className={listPageRootClassName()}>
      {/* ── Top controls: Search + Create Button flush with header ── */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <ListPageSearchField
          value={search}
          onCommit={(v) => setSearch(v || "")}
          className="sm:max-w-sm"
          placeholder="Search templates…"
        />
        <AppButton onClick={handleCreate} id="create-template-btn">
          <Plus className="size-4" />
          Create Template
        </AppButton>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <AppTabs
          tabs={CATEGORY_TABS}
          value={activeCategory}
          onValueChange={(id) => setActiveCategory(id as TemplateCategory)}
          ariaLabel="Template category tabs"
          panelIdPrefix="templates-category"
          className="w-full"
        />
      </div>

      {/* ── Grid ── */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-2 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* "Create" card always first */}
          <NewTemplateCard onClick={handleCreate} />

          {filtered.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <FileText size={40} strokeWidth={1.5} />
              <p className="text-sm">No templates match your search.</p>
            </div>
          ) : (
            filtered.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
