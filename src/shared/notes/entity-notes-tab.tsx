"use client";

import * as React from "react";
import { Check, Paperclip, X } from "lucide-react";
import { useTranslations } from "next-intl";
import RichTextEditor from "@/shared/form/components/rich-text-editor";
import {
  NOTE_MAX_BYTES,
  NOTE_MAX_FILES,
  createEntityNote,
  fetchEntityNotes,
  type EntityNote,
} from "@/shared/notes/entity-notes.api";
import {
  resolveEntityAttachmentLabel,
  resolveEntityAttachmentUrl,
} from "@/shared/attachments/entity-attachment-display.util";
import { detailTabSectionClassName } from "@/shared/components/layout/detail-tab-layout";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type DraftFile = {
  key: string;
  file: File;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function EntityNotesTab({ detailPath }: { detailPath: string }) {
  const t = useTranslations("Dashboard.common.notesTab");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [notes, setNotes] = React.useState<EntityNote[]>([]);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [files, setFiles] = React.useState<DraftFile[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [editorKey, setEditorKey] = React.useState(0);

  const usedBytes = files.reduce((sum, row) => sum + row.file.size, 0);

  const loadNotes = React.useCallback(async () => {
    try {
      const rows = await fetchEntityNotes(detailPath);
      setNotes(rows);
    } catch {
      setNotes([]);
    }
  }, [detailPath]);

  React.useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  function resetComposer() {
    setTitle("");
    setContent("");
    setFiles([]);
    setEditorKey((key) => key + 1);
    if (inputRef.current) inputRef.current.value = "";
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list);
    if (inputRef.current) inputRef.current.value = "";
    setFiles((current) => {
      const next = [...current];
      for (const file of incoming) {
        if (next.length >= NOTE_MAX_FILES) {
          toastApiError(new Error(t("tooManyFiles", { max: NOTE_MAX_FILES })), t("tooManyFiles", { max: NOTE_MAX_FILES }));
          break;
        }
        const nextBytes = next.reduce((sum, row) => sum + row.file.size, 0) + file.size;
        if (nextBytes > NOTE_MAX_BYTES) {
          toastApiError(new Error(t("tooLarge", { max: "20 MB" })), t("tooLarge", { max: "20 MB" }));
          break;
        }
        next.push({ key: `${file.name}-${file.size}-${file.lastModified}-${next.length}`, file });
      }
      return next;
    });
  }

  async function saveNote() {
    const trimmedTitle = title.trim();
    const body = plainText(content);
    if (!trimmedTitle && !body && files.length === 0) {
      toastApiError(new Error(t("required")), t("required"));
      return;
    }
    setSaving(true);
    try {
      await createEntityNote(detailPath, {
        title: trimmedTitle,
        content,
        files: files.map((row) => row.file),
      });
      toastSuccess(t("savedToast"));
      resetComposer();
      await loadNotes();
    } catch (error) {
      toastApiError(error, t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn(detailTabSectionClassName, "space-y-4")}>
      {notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note, index) => {
            const label = note.title?.trim() || t("untitled");
            return (
              <li
                key={note.id ?? `note-${index}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{label}</p>
                {note.content?.trim() ? (
                  <div
                    className="prose prose-sm mt-1 max-w-none text-slate-700 dark:prose-invert dark:text-slate-200"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                ) : null}
                {note.attachments?.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {note.attachments.map((file, fileIndex) => {
                      const name = resolveEntityAttachmentLabel(file);
                      const href = resolveEntityAttachmentUrl(file);
                      return (
                        <li key={`${name}-${fileIndex}`}>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-blue-600 hover:underline dark:border-slate-700"
                            >
                              <span className="truncate">{name}</span>
                            </a>
                          ) : (
                            <span className="inline-flex max-w-full items-center rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                              <span className="truncate">{name}</span>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="px-4 pt-3">
          <label className="sr-only" htmlFor="entity-note-title">
            {t("noteTitle")}
          </label>
          <input
            id="entity-note-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("titlePlaceholder")}
            disabled={saving}
            className="w-full border-0 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50"
          />
        </div>

        <div className="px-2 [&_.ProseMirror]:min-h-[7.5rem]">
          <RichTextEditor
            key={editorKey}
            value={content}
            onChange={setContent}
            placeholder={t("contentPlaceholder")}
            readOnly={saving}
            chrome="plain"
            toolbarPlacement="bottom"
            between={
              <div className="border-t border-dashed border-slate-200 px-2 py-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("attachments")}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-500" aria-hidden />
                    {t("filesUploaded", { count: files.length, max: NOTE_MAX_FILES })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
                    {t("storageUsed", { used: formatBytes(usedBytes), max: "20 MB" })}
                  </span>
                </div>
                {files.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {files.map((row) => (
                      <li
                        key={row.key}
                        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <span className="truncate">
                          {row.file.name} ({formatBytes(row.file.size)})
                        </span>
                        <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          aria-label={t("removeFile", { name: row.file.name })}
                          onClick={() => setFiles((current) => current.filter((item) => item.key !== row.key))}
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            }
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-3 py-2 dark:border-slate-700">
          <div>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="sr-only"
              disabled={saving || files.length >= NOTE_MAX_FILES}
              onChange={(event) => addFiles(event.target.files)}
            />
            <button
              type="button"
              disabled={saving || files.length >= NOTE_MAX_FILES}
              onClick={() => inputRef.current?.click()}
              className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              aria-label={t("addFiles")}
              title={t("addFiles")}
            >
              <Paperclip className="size-4" aria-hidden />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={resetComposer}>
              {t("cancel")}
            </AppButton>
            <AppButton type="button" variant="primary" size="sm" loading={saving} onClick={() => void saveNote()}>
              {t("save")}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
