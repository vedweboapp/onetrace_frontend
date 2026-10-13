"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  Save,
  FileText,
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

/**
 * Replaces bare filename `src` attributes in the HTML content with the full
 * backend URL from the template's `attachments` array.
 *
 * The backend stores content like:
 *   <img src="Screenshot from 2026-07-20 17-43-12.png" data-filename="...">
 * and returns attachments with:
 *   { file_name: "Screenshot from 2026-07-20 17-43-12.png", file: "http://...full-url.png" }
 *
 * This function resolves those references so images render correctly in the editor.
 */
function hydrateContentWithAttachments(
  content: string,
  attachments: Template["attachments"],
): string {
  if (!content || !attachments?.length) return content;

  // Build a lookup: file_name → full file URL
  const urlByName = new Map<string, string>();
  for (const att of attachments) {
    if (att.file_name && att.file) {
      urlByName.set(att.file_name, att.file);
      // Also map spaces-as-underscores variant as fallback
      urlByName.set(att.file_name.replace(/\s+/g, "_"), att.file);
    }
  }
  if (urlByName.size === 0) return content;

  // Replace src="<bare-filename>" with src="<full-url>" when the filename is known.
  return content.replace(/(<img[^>]*?\ssrc=)(["'])([^"']+)\2/gi, (match, prefix, quote, src) => {
    // Skip if already a full URL (http/https/data:)
    if (/^https?:\/\/|^data:/i.test(src)) return match;

    const resolved =
      urlByName.get(src) ??
      urlByName.get(decodeURIComponent(src)) ??
      urlByName.get(src.replace(/\s+/g, "_")) ??
      null;

    return resolved ? `${prefix}${quote}${resolved}${quote}` : match;
  });
}

export default function TemplatesEditor({
  template,
  onSave,
  backUrl = "/settings/templates",
  moduleName = "quotations",
}: TemplatesEditorProps) {
  const router = useRouter();
  const isNew = !template;

  const resolvedModuleName = template?.module || template?.module_name || moduleName;
  const [name, setName] = useState(template?.name || template?.template_name || "Untitled Template");

  // Hydrate the initial content: replace bare filenames with full attachment URLs
  const hydratedInitialContent = useMemo(
    () => hydrateContentWithAttachments(template?.content ?? "", template?.attachments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template?.id, template?.content, template?.attachments],
  );

  const contentRef = useRef(hydratedInitialContent);
  const filesRef = useRef<File[]>([]);
  const dirtyRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    // Re-hydrate when the template is (re-)loaded after a save
    const hydrated = hydrateContentWithAttachments(
      template?.content ?? "",
      template?.attachments,
    );
    contentRef.current = hydrated;

    const tName = template?.name || template?.template_name;
    if (tName) setName(tName);
  }, [template?.content, template?.name, template?.template_name, template?.attachments]);

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
        moduleName: resolvedModuleName,
        files: filesRef.current,
        ...(template?.category ? { category: template.category } : {}),
        ...(template?.description ? { description: template.description } : {}),
        ...(template?.id ? { id: template.id } : {}),
      };

      const payload = buildTemplateSavePayload(templateData);
      const rawObject = buildTemplateSaveObject(templateData);

      const attachedBinaryFiles = Array.from(payload.entries())
        .filter(([, v]) => typeof v !== "string" && v instanceof File)
        .map(([k, v]) => ({
          key: k,
          name: (v as File).name,
          size: `${(v as File).size} bytes`,
          type: (v as File).type,
        }));

      console.log("[Template Save Payload (FormData)]", {
        fields: Object.fromEntries(
          Array.from(payload.entries()).map(([k, v]) => [
            k,
            typeof v === "string" ? v : `(binary: ${(v as File).name})`,
          ])
        ),
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
          value={hydratedInitialContent}
          onChange={handleContentChange}
          autoFocus={isNew}
          moduleName={resolvedModuleName}
        />
      </div>
    </div>
  );
}