"use client";

import * as React from "react";
import { Check, Paperclip, Pencil, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import RichTextEditor from "@/shared/form/components/rich-text-editor";
import {
  NOTE_MAX_BYTES,
  NOTE_MAX_FILES,
  createEntityNote,
  deleteEntityNote,
  fetchEntityNotes,
  updateEntityNote,
  type EntityNote,
} from "@/shared/notes/entity-notes.api";
import type { EntityAttachment } from "@/shared/attachments/entity-attachment.types";
import {
  resolveEntityAttachmentLabel,
  resolveEntityAttachmentUrl,
} from "@/shared/attachments/entity-attachment-display.util";
import { detailTabSectionClassName } from "@/shared/components/layout/detail-tab-layout";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { AppButton, ConfirmDialog } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type DraftFile = {
  key: string;
  file: File;
};

type ComposerMode = { kind: "create" } | { kind: "edit"; note: EntityNote };

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

function noteTime(note: EntityNote): string | null {
  const raw = note.modified_at || note.created_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : raw;
}

function sortNotes(rows: EntityNote[]): EntityNote[] {
  return [...rows].sort((a, b) => {
    const aTime = Date.parse(a.created_at ?? "") || 0;
    const bTime = Date.parse(b.created_at ?? "") || 0;
    return bTime - aTime;
  });
}

export function EntityNotesTab({ detailPath }: { detailPath: string }) {
  const t = useTranslations("Dashboard.common.notesTab");
  const tActions = useTranslations("Dashboard.common.actions");
  const dateFmt = useDashboardDateFormat();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [notes, setNotes] = React.useState<EntityNote[]>([]);
  const [mode, setMode] = React.useState<ComposerMode | null>(null);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [files, setFiles] = React.useState<DraftFile[]>([]);
  const [keptAttachments, setKeptAttachments] = React.useState<EntityAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = React.useState<number[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<EntityNote | null>(null);
  const [editorKey, setEditorKey] = React.useState(0);

  const usedBytes =
    files.reduce((sum, row) => sum + row.file.size, 0) +
    keptAttachments.reduce((sum, file) => sum + (typeof file.file_size === "number" ? file.file_size : 0), 0);
  const fileCount = files.length + keptAttachments.length;

  const loadNotes = React.useCallback(async () => {
    try {
      setNotes(sortNotes(await fetchEntityNotes(detailPath)));
    } catch {
      setNotes([]);
    }
  }, [detailPath]);

  React.useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  function closeComposer() {
    setMode(null);
    setTitle("");
    setContent("");
    setFiles([]);
    setKeptAttachments([]);
    setRemovedAttachmentIds([]);
    setEditorKey((key) => key + 1);
    if (inputRef.current) inputRef.current.value = "";
  }

  function openCreate() {
    closeComposer();
    setMode({ kind: "create" });
  }

  function openEdit(note: EntityNote) {
    setTitle(note.title?.trim() ?? "");
    setContent(note.content ?? "");
    setFiles([]);
    setKeptAttachments(note.attachments ?? []);
    setRemovedAttachmentIds([]);
    setEditorKey((key) => key + 1);
    setMode({ kind: "edit", note });
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list);
    if (inputRef.current) inputRef.current.value = "";
    setFiles((current) => {
      const next = [...current];
      const keptCount = keptAttachments.length;
      for (const file of incoming) {
        if (keptCount + next.length >= NOTE_MAX_FILES) {
          toastApiError(new Error(t("tooManyFiles", { max: NOTE_MAX_FILES })), t("tooManyFiles", { max: NOTE_MAX_FILES }));
          break;
        }
        const nextBytes =
          keptAttachments.reduce((sum, item) => sum + (typeof item.file_size === "number" ? item.file_size : 0), 0) +
          next.reduce((sum, row) => sum + row.file.size, 0) +
          file.size;
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
    if (!trimmedTitle && !body && fileCount === 0) {
      toastApiError(new Error(t("required")), t("required"));
      return;
    }
    setSaving(true);
    try {
      if (mode?.kind === "edit" && mode.note.id != null) {
        await updateEntityNote(detailPath, mode.note.id, {
          title: trimmedTitle,
          content,
          files: files.map((row) => row.file),
          deletedAttachmentIds: removedAttachmentIds,
        });
        toastSuccess(t("updatedToast"));
      } else {
        await createEntityNote(detailPath, {
          title: trimmedTitle,
          content,
          files: files.map((row) => row.file),
        });
        toastSuccess(t("savedToast"));
      }
      closeComposer();
      await loadNotes();
    } catch (error) {
      toastApiError(error, t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const noteId = pendingDelete?.id;
    if (noteId == null) return;
    setDeletingId(noteId);
    try {
      await deleteEntityNote(detailPath, noteId);
      if (mode?.kind === "edit" && mode.note.id === noteId) closeComposer();
      toastSuccess(t("deletedToast"));
      setPendingDelete(null);
      await loadNotes();
    } catch (error) {
      toastApiError(error, t("deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={cn(detailTabSectionClassName, "space-y-4")}>
      {mode ? (
        <NoteComposer
          title={title}
          content={content}
          files={files}
          keptAttachments={keptAttachments}
          fileCount={fileCount}
          usedBytes={usedBytes}
          saving={saving}
          editorKey={editorKey}
          inputRef={inputRef}
          saveLabel={mode.kind === "edit" ? t("save") : t("create")}
          onTitleChange={setTitle}
          onContentChange={setContent}
          onAddFiles={addFiles}
          onRemoveFile={(key) => setFiles((current) => current.filter((item) => item.key !== key))}
          onRemoveKept={(file) => {
            setKeptAttachments((current) => current.filter((item) => item !== file));
            if (typeof file.id === "number") {
              setRemovedAttachmentIds((current) => (current.includes(file.id!) ? current : [...current, file.id!]));
            }
          }}
          onCancel={closeComposer}
          onSave={() => void saveNote()}
        />
      ) : (
        <div className="flex justify-end">
          <AppButton type="button" variant="primary" size="sm" onClick={openCreate}>
            {t("create")}
          </AppButton>
        </div>
      )}

      {notes.length === 0 && !mode ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t("empty")}
        </p>
      ) : null}

      {notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note, index) => {
            const label = note.title?.trim() || t("untitled");
            const when = noteTime(note);
            const body = note.content && plainText(note.content) ? note.content : "";
            const canChange = note.id != null;
            return (
              <li
                key={note.id ?? `note-${index}`}
                className={cn(
                  "group rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950",
                  mode?.kind === "edit" && mode.note.id === note.id && "ring-2 ring-slate-900/10 dark:ring-white/15",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{label}</p>
                    {note.author || when ? (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {[note.author, when ? dateFmt.format(new Date(when)) : null].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  {canChange ? (
                    <div
                      className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                      aria-label={t("noteActions")}
                    >
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        aria-label={t("editAria")}
                        title={t("edit")}
                        onClick={() => openEdit(note)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        aria-label={t("deleteAria")}
                        title={t("delete")}
                        onClick={() => setPendingDelete(note)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </div>
                {body ? (
                  <div
                    className="prose prose-sm mt-2 max-w-none text-slate-700 dark:prose-invert dark:text-slate-200"
                    dangerouslySetInnerHTML={{ __html: body }}
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

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => {
          if (deletingId == null) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
        title={t("deleteTitle")}
        body={t("deleteBody")}
        highlight={pendingDelete?.title?.trim() || t("untitled")}
        confirmLabel={t("delete")}
        cancelLabel={tActions("cancel")}
        isBusy={deletingId != null}
      />
    </div>
  );
}

function NoteComposer({
  title,
  content,
  files,
  keptAttachments,
  fileCount,
  usedBytes,
  saving,
  editorKey,
  inputRef,
  saveLabel,
  onTitleChange,
  onContentChange,
  onAddFiles,
  onRemoveFile,
  onRemoveKept,
  onCancel,
  onSave,
}: {
  title: string;
  content: string;
  files: DraftFile[];
  keptAttachments: EntityAttachment[];
  fileCount: number;
  usedBytes: number;
  saving: boolean;
  editorKey: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  saveLabel: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onAddFiles: (list: FileList | null) => void;
  onRemoveFile: (key: string) => void;
  onRemoveKept: (file: EntityAttachment) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useTranslations("Dashboard.common.notesTab");

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="px-4 pt-3">
        <label className="sr-only" htmlFor="entity-note-title">
          {t("noteTitle")}
        </label>
        <input
          id="entity-note-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={t("titlePlaceholder")}
          disabled={saving}
          className="w-full border-0 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50"
        />
      </div>

      <div className="px-2 [&_.ProseMirror]:min-h-[7.5rem]">
        <RichTextEditor
          key={editorKey}
          value={content}
          onChange={onContentChange}
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
                  {t("filesUploaded", { count: fileCount, max: NOTE_MAX_FILES })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
                  {t("storageUsed", { used: formatBytes(usedBytes), max: "20 MB" })}
                </span>
              </div>
              {keptAttachments.length > 0 || files.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {keptAttachments.map((file, index) => {
                    const name = resolveEntityAttachmentLabel(file);
                    return (
                      <li
                        key={`kept-${file.id ?? index}`}
                        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <span className="truncate">{name}</span>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          aria-label={t("removeFile", { name })}
                          onClick={() => onRemoveKept(file)}
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    );
                  })}
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
                        onClick={() => onRemoveFile(row.key)}
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
            disabled={saving || fileCount >= NOTE_MAX_FILES}
            onChange={(event) => onAddFiles(event.target.files)}
          />
          <button
            type="button"
            disabled={saving || fileCount >= NOTE_MAX_FILES}
            onClick={() => inputRef.current?.click()}
            className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
            aria-label={t("addFiles")}
            title={t("addFiles")}
          >
            <Paperclip className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={onCancel}>
            {t("cancel")}
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" loading={saving} onClick={onSave}>
            {saveLabel}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
