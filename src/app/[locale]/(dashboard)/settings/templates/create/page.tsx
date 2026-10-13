"use client";

import TemplatesEditor from "@/shared/templates/components/builder/templates-editor";
import { toastSuccess, toastError } from "@/shared/feedback/app-toast";
import { createTemplate } from "@/shared/templates/api/template.api";

export default function CreateTemplatePage() {
  const handleSave = async (name: string, content: string, payload?: FormData) => {
    try {
      if (payload) {
        const saved = await createTemplate(payload);
        toastSuccess(`Template "${saved.name}" saved successfully!`);
      } else {
        const fd = new FormData();
        fd.append("name", name);
        fd.append("content", content);
        const saved = await createTemplate(fd);
        toastSuccess(`Template "${saved.name}" saved successfully!`);
      }
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
      <TemplatesEditor onSave={handleSave} />
    </div>
  );
}
