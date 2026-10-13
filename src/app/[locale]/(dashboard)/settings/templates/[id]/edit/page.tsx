"use client";

import { use, useEffect, useState } from "react";
import TemplatesEditor from "@/shared/templates/components/builder/templates-editor";
import { toastSuccess, toastError } from "@/shared/feedback/app-toast";
import { getTemplateById, updateTemplate } from "@/shared/templates/api/template.api";
import type { Template } from "@/shared/templates/types/template.types";

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void getTemplateById(id).then((t) => {
      if (mounted) {
        setTemplate(t);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSave = async (name: string, content: string, payload?: FormData) => {
    try {
      if (payload) {
        const saved = await updateTemplate(id, payload);
        setTemplate(saved);
        toastSuccess(`Template "${saved.name}" saved successfully!`);
      } else {
        const fd = new FormData();
        fd.append("template_name", name);
        fd.append("name", name);
        fd.append("content", content);
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
        moduleName={template?.module || template?.module_name || "quotations"}
      />
    </div>
  );
}
