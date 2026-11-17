"use client";

import { use, useEffect, useState } from "react";
import TemplatesEditor from "@/shared/templates/components/builder/templates-editor";
import { toastSuccess, toastError } from "@/shared/feedback/app-toast";
import { getTemplateById, updateTemplate } from "@/shared/templates/api/template.api";
import type { Template } from "@/shared/templates/types/template.types";

export default function EditTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ module?: string; module_name?: string; form_id?: string }>;
}) {
  const { id } = use(params);
  const resolvedQuery = searchParams ? use(searchParams) : undefined;
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  const queryModule = resolvedQuery?.module_name || resolvedQuery?.module;
  const queryFormId = resolvedQuery?.form_id;

  const effectiveModule = (
    queryModule ||
    template?.module ||
    template?.module_name ||
    template?.category ||
    "quotations"
  ).trim();

  const effectiveFormId = queryFormId || template?.form_id || null;

  useEffect(() => {
    let mounted = true;
    void getTemplateById(id).then((t) => {
      if (mounted) {
        setTemplate(t);
        setLoading(false);

        // Keep browser URL synchronized with the template's module and form_id
        if (typeof window !== "undefined" && t) {
          const mod = (t.module || t.module_name || t.category || "").trim();
          const fId = t.form_id;
          const currentUrl = new URL(window.location.href);
          let changed = false;
          if (mod && !currentUrl.searchParams.has("module") && !currentUrl.searchParams.has("module_name")) {
            currentUrl.searchParams.set("module", mod);
            changed = true;
          }
          if (fId && !currentUrl.searchParams.has("form_id") && !currentUrl.searchParams.has("id")) {
            currentUrl.searchParams.set("form_id", String(fId));
            changed = true;
          }
          if (changed) {
            window.history.replaceState(null, "", currentUrl.toString());
          }
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSave = async (name: string, content: string, payload?: FormData) => {
    try {
      const isProjectForms = effectiveModule.toLowerCase().trim() === "project_forms";
      if (payload) {
        if (isProjectForms && effectiveFormId) {
          if (!payload.has("form_id")) {
            payload.append("form_id", String(effectiveFormId));
          }
        } else {
          payload.delete("form_id");
        }
        const saved = await updateTemplate(id, payload);
        setTemplate(saved);
        toastSuccess(`Template "${saved.name}" saved successfully!`);
      } else {
        const fd = new FormData();
        fd.append("template_name", name);
        fd.append("name", name);
        fd.append("content", content);
        if (isProjectForms && effectiveFormId) {
          fd.append("form_id", String(effectiveFormId));
        }
        const saved = await updateTemplate(id, fd);
        setTemplate(saved);
        toastSuccess(`Template "${saved.name}" saved successfully!`);
      }
      // Stay on the editor — do not navigate away
    } catch (err) {
      console.error("Failed to update template:", err);
      toastError("Failed to save template. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-sm text-slate-500 animate-pulse">Loading template...</div>
      </div>
    );
  }

  return (
    <div
      data-full-bleed-page
      className="dashboard-full-bleed-page flex h-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      <TemplatesEditor
        template={template}
        onSave={handleSave}
        formId={effectiveFormId}
        moduleName={effectiveModule}
        backUrl={`/settings/templates?module=${encodeURIComponent(effectiveModule)}`}
      />
    </div>
  );
}
