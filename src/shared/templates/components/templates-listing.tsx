"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  MoreVertical,
  Clock,
  Star,
  ShoppingCart,
  Receipt,
  Mail,
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

// ─── Module options (for the create modal) ───────────────────────────────────
const MODULE_OPTIONS = [
  {
    id: "quotations",
    label: "Quotation",
    description: "Templates for quotes and proposals sent to clients.",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    hoverBorder: "hover:border-blue-400 dark:hover:border-blue-500",
    activeBg: "bg-blue-100 dark:bg-blue-900/50",
  },
  {
    id: "orders",
    label: "Orders",
    description: "Templates for purchase orders and work orders.",
    icon: ShoppingCart,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-500",
    activeBg: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  {
    id: "invoice",
    label: "Invoice",
    description: "Templates for billing and payment invoices.",
    icon: Receipt,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800",
    hoverBorder: "hover:border-violet-400 dark:hover:border-violet-500",
    activeBg: "bg-violet-100 dark:bg-violet-900/50",
  },
  {
    id: "email",
    label: "Email",
    description: "Templates for automated and manual email communications.",
    icon: Mail,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800",
    hoverBorder: "hover:border-orange-400 dark:hover:border-orange-500",
    activeBg: "bg-orange-100 dark:bg-orange-900/50",
  },
] as const;

type ModuleId = (typeof MODULE_OPTIONS)[number]["id"];

// ─── Module selection modal ───────────────────────────────────────────────────
function ModuleSelectModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (module: ModuleId) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<ModuleId | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Select Template Module
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Choose the module this template belongs to. This determines the available variables.
          </p>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-2 gap-3 px-6 pb-4">
          {MODULE_OPTIONS.map((mod) => {
            const Icon = mod.icon;
            const isSelected = selected === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelected(mod.id)}
                className={[
                  "flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-150",
                  isSelected
                    ? `${mod.activeBg} ${mod.border}`
                    : `bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 ${mod.hoverBorder}`,
                ].join(" ")}
              >
                <div className={`w-9 h-9 rounded-lg ${mod.bg} flex items-center justify-center`}>
                  <Icon size={18} className={mod.color} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {mod.label}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {mod.description}
                  </p>
                </div>
                {isSelected && (
                  <div className={`mt-auto text-[10px] font-medium ${mod.color} flex items-center gap-1`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <AppButton variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
          >
            Continue
          </AppButton>
        </div>
      </div>
    </div>
  );
}

// ─── Mock data (replace with API calls) ──────────────────────────────────────

const CATEGORY_TABS: AppTabItem[] = [
  { id: "all", label: "All Templates" },
  { id: "quotations", label: "Quotations" },
  { id: "orders", label: "Orders" },
  { id: "invoice", label: "Invoice" },
  { id: "email", label: "Email" },
];

const CATEGORY_COLORS: Record<string, string> = {
  quotations: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  orders: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  invoice: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  email: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
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
      {/* ── Three-dot menu — overlaid on top-right corner of the whole card ── */}
      <div
        ref={menuRef}
        className="absolute top-2 right-2 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          title="More options"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-150"
        >
          <MoreVertical size={14} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onEdit(template);
              }}
            >
              <Pencil size={13} className="text-slate-500" />
              Edit template
            </button>
            <div className="mx-3 h-px bg-slate-100 dark:bg-slate-700" />
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete(template);
              }}
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Document thumbnail */}
      <div className="relative h-44 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center justify-start p-4 overflow-hidden">
        {/* A4-like mini page */}
        <div className="w-full max-w-[140px] h-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-[7px] leading-[1.4] text-slate-600 dark:text-slate-400 overflow-hidden select-none">
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

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-slate-900/10 dark:bg-white/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
            Open Template
          </span>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex flex-col gap-1.5 p-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight line-clamp-1">
          {template.name}
        </p>

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

// ─── Skeleton card (shown while API is loading) ─────────────────────────────
function TemplateCardSkeleton() {
  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs animate-pulse">
      {/* Thumbnail area */}
      <div className="h-44 bg-slate-100 dark:bg-slate-800" />

      {/* Footer area */}
      <div className="flex flex-col gap-2.5 p-3">
        <div className="h-3.5 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-2.5 w-2/3 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="flex items-center justify-between mt-1">
          <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-3 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
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

const VALID_MODULES: TemplateCategory[] = ["quotations", "orders", "invoice", "email"];

export default function TemplatesListing() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialise active tab from URL ?module= param
  const moduleParam = searchParams.get("module") as TemplateCategory | null;
  const initialCategory: TemplateCategory =
    moduleParam && (VALID_MODULES as string[]).includes(moduleParam)
      ? moduleParam
      : "all";

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>(initialCategory);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  // Controls the module-select modal visibility (only for "All Templates" tab)
  const [showModuleModal, setShowModuleModal] = useState(false);

  // Sync tab → URL whenever activeCategory changes
  const handleCategoryChange = useCallback(
    (category: TemplateCategory) => {
      setActiveCategory(category);
      const params = new URLSearchParams(searchParams.toString());
      if (category === "all") {
        params.delete("module");
      } else {
        params.set("module", category);
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}` as never);
    },
    [pathname, router, searchParams],
  );

  // Sync URL → tab when browser back/forward changes searchParams
  useEffect(() => {
    const param = searchParams.get("module") as TemplateCategory | null;
    const resolved: TemplateCategory =
      param && (VALID_MODULES as string[]).includes(param) ? param : "all";
    setActiveCategory(resolved);
  }, [searchParams]);

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
    // Match against either module or category field
    const moduleOrCat = (t.module ?? t.category ?? "").toLowerCase();
    const matchesCategory =
      activeCategory === "all" || moduleOrCat === activeCategory.toLowerCase();
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
    if (activeCategory === "all") {
      // Show modal on listing page first — navigate only after module is chosen
      setShowModuleModal(true);
    } else {
      // Module is already known from the active tab — go directly to the editor
      router.push(`${routes.dashboard.settingsTemplates}/create?module=${activeCategory}`);
    }
  };

  const handleModuleConfirm = (module: ModuleId) => {
    setShowModuleModal(false);
    router.push(`${routes.dashboard.settingsTemplates}/create?module=${module}`);
  };

  return (
    <div className={listPageRootClassName()}>
      {/* Module selection modal — shown on listing page before navigating */}
      {showModuleModal && (
        <ModuleSelectModal
          onConfirm={handleModuleConfirm}
          onCancel={() => setShowModuleModal(false)}
        />
      )}

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
          onValueChange={(id) => handleCategoryChange(id as TemplateCategory)}
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

          {loading ? (
            // Skeleton cards while API request is in-flight
            Array.from({ length: 7 }).map((_, i) => (
              <TemplateCardSkeleton key={i} />
            ))
          ) : filtered.length === 0 ? (
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
