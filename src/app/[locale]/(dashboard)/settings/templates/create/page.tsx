"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import TemplatesEditor from "@/shared/templates/components/builder/templates-editor";
import { toastSuccess, toastError } from "@/shared/feedback/app-toast";
import { createTemplate } from "@/shared/templates/api/template.api";

export default function CreateTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; module_name?: string; form_id?: string }>;
}) {
  const resolvedParams = use(searchParams);
  const router = useRouter();
  const moduleName =
    resolvedParams.module_name ||
    resolvedParams.module ||
    "quotations";
  const formId = resolvedParams.form_id;

  const handleSave = async (_name: string, _content: string, payload?: FormData) => {
    try {
      const fd = payload ?? new FormData();
      const isProjectForms = moduleName.toLowerCase().trim() === "project_forms";
      if (isProjectForms && formId) {
        if (!fd.has("form_id")) {
          fd.append("form_id", String(formId));
        }
      } else {
        fd.delete("form_id");
      }
      const saved = await createTemplate(fd);
      toastSuccess(`Template "${saved.name}" saved successfully!`);
      const nextQuery = new URLSearchParams();
      if (moduleName) nextQuery.set("module", moduleName);
      if (isProjectForms && formId) nextQuery.set("form_id", String(formId));
      const queryStr = nextQuery.toString();
      router.push(`/settings/templates/${saved.id}/edit${queryStr ? `?${queryStr}` : ""}`);
    } catch (err) {
      console.error("Failed to create template:", err);
      toastError("Failed to save template. Please try again.");
    }
  };

  return (
    <div
      data-full-bleed-page
      className="dashboard-full-bleed-page flex h-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      <TemplatesEditor onSave={handleSave} moduleName={moduleName} formId={formId} />
    </div>
  );
}
