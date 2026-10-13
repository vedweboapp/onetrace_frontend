"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  Save,
  FileText,
  Loader2,
} from "lucide-react";
import type { Template } from "../../types/template.types";
import {
  buildTemplateSavePayload,
  buildTemplateSaveObject,
} from "../../api/template-variables.api";
import TemplateDocEditor from "./editor";
import { AppButton } from "@/shared/ui";

interface TemplatesEditorProps {
  template?: Template | null;
  onSave?: (
    name: string,
    content: string,
    payload: FormData,
    rawObject: ReturnType<typeof buildTemplateSaveObject>
  ) => Promise<void>;
  backUrl?: string;
  moduleName?: string;
}

export default function TemplatesEditor({
  template,
  onSave,
  backUrl = "/settings/templates",
  moduleName = "quotations",
}: TemplatesEditorProps) {
  const router = useRouter();
  const isNew = !template;

  const [name, setName] = useState(template?.name ?? "Untitled Template");
  const contentRef = useRef(template?.content ?? "");
  const filesRef = useRef<File[]>([]);
  const dirtyRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    if (template?.content) {
      contentRef.current = template.content;
    }
    if (template?.name) {
      setName(template.name);
    }
  }, [template?.content, template?.name]);

  const handleContentChange = useCallback((html: string, newFiles?: File[]) => {
    contentRef.current = html;
    if (newFiles && newFiles.length > 0) {
      filesRef.current = newFiles;
    }
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      setDirty(true);
    }
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const templateData = {
        name: name.trim(),
        content: contentRef.current,
        moduleName,
        files: filesRef.current,
        ...(template?.category ? { category: template.category } : {}),
        ...(template?.description ? { description: template.description } : {}),
        ...(template?.id ? { id: template.id } : {}),
      };

      // Build FormData payload (with binary files attached)
      const payload = buildTemplateSavePayload(templateData);
      const rawObject = buildTemplateSaveObject(templateData);

      // Log both so developer can inspect either easily
      const attachedBinaryFiles = payload.getAll("files");
      console.log("[Template Save Payload (FormData)]", {
        fields: Object.fromEntries(payload.entries()),
        binaryFiles: attachedBinaryFiles,
      });
      console.log("[Template Save Payload (Object)]", rawObject);

      await onSave?.(name.trim(), contentRef.current, payload, rawObject);
      dirtyRef.current = false;
      setDirty(false);
    } catch {
      // error handled by caller toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-950">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm">
        <button
          type="button"
          onClick={() => router.push(backUrl)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Templates</span>
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

        {/* Document name – inline editable */}
        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); setDirty(true); }}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className="flex-1 text-sm font-medium bg-transparent border-b-2 border-blue-500 outline-none text-slate-900 dark:text-white max-w-xs"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1.5 group"
          >
            <FileText size={15} className="text-blue-500 shrink-0" />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:underline decoration-dashed underline-offset-2 max-w-[260px] truncate">
              {name}
            </span>
            {dirty && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-0.5">●</span>
            )}
          </button>
        )}

        <div className="flex-1" />

        {/* Save button */}
        <AppButton
          variant="primary"
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={!dirty}
          className="gap-1.5"
        >
          <Save className="size-3.5" />
          {isNew ? "Create" : "Save"}
        </AppButton>
      </div>

      {/* ── Editor ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TemplateDocEditor
          value={template?.content ?? ""}
          onChange={handleContentChange}
          autoFocus={isNew}
          moduleName={moduleName}
        />
      </div>
    </div>
  );
}