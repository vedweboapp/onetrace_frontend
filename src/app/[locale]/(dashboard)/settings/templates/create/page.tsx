"use client";

import { use } from "react";
import TemplatesEditor from "@/shared/templates/components/builder/templates-editor";
import { toastSuccess, toastError } from "@/shared/feedback/app-toast";
import { createTemplate } from "@/shared/templates/api/template.api";

const VALID_MODULES = ["quotations", "orders", "invoice", "email"];

export default function CreateTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const resolvedParams = use(searchParams);
  const moduleName =
    resolvedParams.module && VALID_MODULES.includes(resolvedParams.module)
      ? resolvedParams.module
      : "quotations";

  const handleSave = async (_name: string, _content: string, payload?: FormData) => {
    try {
      const fd = payload ?? new FormData();
      const saved = await createTemplate(fd);
      toastSuccess(`Template "${saved.name}" saved successfully!`);
      // Stay on the editor — do not navigate away
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
      <TemplatesEditor onSave={handleSave} moduleName={moduleName} />
    </div>
  );
}
