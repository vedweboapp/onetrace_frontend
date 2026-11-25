"use client";

import * as React from "react";
import {
  ArrowLeft,
  Check,
  Download,
  Edit3,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import api from "@/core/api/axios";
import { triggerBlobDownload } from "@/shared/mass-actions/mass-action.util";
import {
  createMaterialRequestFolder,
  deleteMaterialRequestFolder,
  fetchMaterialRequestFolders,
  updateMaterialRequestAttachments,
  updateMaterialRequestFolder,
} from "@/features/material-requests/api/material-request.api";
import { moveEntityAttachment } from "@/shared/attachments/move-entity-attachment.util";
import { MATERIAL_REQUEST_PATHS } from "@/features/material-requests/api/material-request.paths";
import type { MaterialRequestFolder } from "@/features/material-requests/types/material-request-folder.types";
import type { MaterialRequestDetail } from "@/features/material-requests/types/material-request.types";
import type { EntityAttachment } from "@/shared/attachments/entity-attachment.types";
import {
  detailTabBodyClassName,
  detailTabSectionClassName,
  detailTabToolbarClassName,
} from "@/shared/components/layout/detail-tab-layout";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

export type MaterialRequestAttachmentsTabProps = {
  detail: MaterialRequestDetail;
  onSaved: () => void | Promise<void>;
};

function resolveAttachmentFolderId(
  folder: number | { id?: number; name?: string } | string | null | undefined,
): number | null {
  if (folder == null) return null;
  if (typeof folder === "number") return folder;
  if (typeof folder === "object" && typeof folder.id === "number") return folder.id;
  if (typeof folder === "string") {
    const parsed = Number.parseInt(folder, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType?: string | null, fileName?: string | null) {
  const type = (contentType ?? "").toLowerCase();
  const name = (fileName ?? "").toLowerCase();

  if (type.includes("pdf") || name.endsWith(".pdf")) {
    return <FileText className="size-4 shrink-0 text-red-500" aria-hidden />;
  }
  if (
    type.includes("image") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".svg")
  ) {
    return <FileImage className="size-4 shrink-0 text-blue-500" aria-hidden />;
  }
  if (
    type.includes("sheet") ||
    type.includes("excel") ||
    type.includes("csv") ||
    name.endsWith(".csv") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  ) {
    return <FileSpreadsheet className="size-4 shrink-0 text-emerald-500" aria-hidden />;
  }
  return <File className="size-4 shrink-0 text-slate-400" aria-hidden />;
}

async function downloadAttachmentFile(url: string, filename: string) {
  try {
    const res = await api.get<Blob>(url, { responseType: "blob" });
    if (res.data) {
      triggerBlobDownload(res.data, filename);
      return;
    }
  } catch {
    // continue
  }

  const candidateUrls: string[] = [];
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.href : undefined);
    if (parsed.pathname.startsWith("/backend/media/") || parsed.pathname.startsWith("/media/")) {
      candidateUrls.push(`${parsed.pathname}${parsed.search}`);
    }
  } catch {
    // ignore
  }
  candidateUrls.push(url);

  for (const candidate of candidateUrls) {
    try {
      const res = await fetch(candidate);
      if (res.ok) {
        const blob = await res.blob();
        triggerBlobDownload(blob, filename);
        return;
      }
    } catch {
      // try next
    }
  }

  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.open(url, "_blank");
  }
}

export function MaterialRequestAttachmentsTab({ detail, onSaved }: MaterialRequestAttachmentsTabProps) {
  const t = useTranslations("Dashboard.quotations");
  const tCommon = useTranslations("Dashboard.common.actions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const urlFolderId = React.useMemo(() => {
    const raw = searchParams.get("folder_id") ?? searchParams.get("folder");
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const [folders, setFolders] = React.useState<MaterialRequestFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = React.useState(true);
  const [activeFolderId, setActiveFolderIdState] = React.useState<number | null>(urlFolderId);

  React.useEffect(() => {
    setActiveFolderIdState(urlFolderId);
  }, [urlFolderId]);

  const setActiveFolderId = React.useCallback(
    (id: number | null) => {
      setActiveFolderIdState(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id != null) {
        params.set("folder_id", String(id));
      } else {
        params.delete("folder_id");
        params.delete("folder");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setActiveFolderIdRef = React.useRef(setActiveFolderId);
  setActiveFolderIdRef.current = setActiveFolderId;

  // Folder modal state
  const [folderModalOpen, setFolderModalOpen] = React.useState(false);
  const [folderModalMode, setFolderModalMode] = React.useState<"create" | "rename">("create");
  const [editingFolder, setEditingFolder] = React.useState<MaterialRequestFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = React.useState("");
  const [folderModalBusy, setFolderModalBusy] = React.useState(false);

  // Inline folder rename state
  const [isEditingFolderName, setIsEditingFolderName] = React.useState(false);
  const [inlineFolderName, setInlineFolderName] = React.useState("");
  const [folderRenameSaving, setFolderRenameSaving] = React.useState(false);
  const inlineRenameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setIsEditingFolderName(false);
  }, [activeFolderId]);

  React.useEffect(() => {
    if (isEditingFolderName) {
      inlineRenameInputRef.current?.focus();
      inlineRenameInputRef.current?.select();
    }
  }, [isEditingFolderName]);

  function startInlineFolderEdit() {
    if (!activeFolder) return;
    setInlineFolderName(activeFolder.name);
    setIsEditingFolderName(true);
  }

  async function handleSaveInlineFolderName() {
    if (!activeFolder || folderRenameSaving) return;
    const nextName = inlineFolderName.trim();
    if (!nextName) return;
    if (nextName === activeFolder.name) {
      setIsEditingFolderName(false);
      return;
    }
    setFolderRenameSaving(true);
    try {
      await updateMaterialRequestFolder(detail.id, activeFolder.id, nextName);
      toastSuccess(t("folders.updatedToast"));
      setIsEditingFolderName(false);
      await loadFolders();
    } catch (error) {
      toastApiError(error, "Failed to rename folder");
    } finally {
      setFolderRenameSaving(false);
    }
  }

  const [uploading, setUploading] = React.useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = React.useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [dragOverFolderId, setDragOverFolderId] = React.useState<number | null>(null);
  const dragCounterRef = React.useRef(0);

  const loadFolders = React.useCallback(async () => {
    try {
      setFoldersLoading(true);
      const data = await fetchMaterialRequestFolders(detail.id);
      setFolders(data);
    } catch {
      setFolders([]);
    } finally {
      setFoldersLoading(false);
    }
  }, [detail.id]);

  React.useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  const attachments: EntityAttachment[] = React.useMemo(() => {
    return ((detail.attachments ?? []) as EntityAttachment[]).filter(
      (a) => a && (a.file || a.file_name || (a as any).attachment || (a as any).file_url || (a as any).url),
    );
  }, [detail.attachments]);

  const { folderFilesMap, unfiledFiles } = React.useMemo(() => {
    const fMap = new Map<number, EntityAttachment[]>();
    const unfiled: EntityAttachment[] = [];

    for (const att of attachments) {
      const fId = resolveAttachmentFolderId(att.folder);
      if (fId != null) {
        const list = fMap.get(fId) ?? [];
        list.push(att);
        fMap.set(fId, list);
      } else {
        unfiled.push(att);
      }
    }
    return { folderFilesMap: fMap, unfiledFiles: unfiled };
  }, [attachments]);

  const activeFolder = React.useMemo(() => {
    if (activeFolderId == null) return null;
    return folders.find((f) => f.id === activeFolderId) ?? null;
  }, [folders, activeFolderId]);

  React.useEffect(() => {
    if (activeFolderId != null && !foldersLoading && folders.length > 0) {
      const exists = folders.some((f) => f.id === activeFolderId);
      if (!exists) {
        setActiveFolderIdRef.current(null);
      }
    }
  }, [activeFolderId, foldersLoading, folders]);

  function openCreateFolderModal() {
    setFolderModalMode("create");
    setEditingFolder(null);
    setFolderNameInput("");
    setFolderModalOpen(true);
  }

  function openRenameFolderModal(folder: MaterialRequestFolder) {
    setFolderModalMode("rename");
    setEditingFolder(folder);
    setFolderNameInput(folder.name);
    setFolderModalOpen(true);
  }

  async function handleFolderModalSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const name = folderNameInput.trim();
    if (!name || folderModalBusy) return;

    setFolderModalBusy(true);
    try {
      if (folderModalMode === "create") {
        await createMaterialRequestFolder(detail.id, name);
        toastSuccess(t("folders.createdToast"));
      } else if (editingFolder) {
        await updateMaterialRequestFolder(detail.id, editingFolder.id, name);
        toastSuccess(t("folders.updatedToast"));
      }
      setFolderModalOpen(false);
      await loadFolders();
    } catch (error) {
      toastApiError(error, "Failed to save folder");
    } finally {
      setFolderModalBusy(false);
    }
  }

  async function handleDeleteFolder(folder: MaterialRequestFolder) {
    if (!window.confirm(t("folders.deleteConfirm"))) return;
    try {
      await deleteMaterialRequestFolder(detail.id, folder.id);
      toastSuccess(t("folders.deletedToast"));
      if (activeFolderId === folder.id) {
        setActiveFolderId(null);
      }
      await loadFolders();
    } catch (error) {
      toastApiError(error, "Failed to delete folder");
    }
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  async function handleFileUpload(
    files: FileList | File[] | null,
    targetFolderId: number | null = activeFolderId,
  ) {
    if (!files || files.length === 0 || uploading) return;
    const fileList = Array.from(files);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploading(true);
    try {
      const refs = fileList.map((file) => ({
        file,
        folder: targetFolderId,
      }));
      await updateMaterialRequestAttachments(detail.id, refs, { folderId: targetFolderId });
      toastSuccess(t("attachmentsTab.uploadedToast"));
      await onSaved();
    } catch (error) {
      toastApiError(error, t("attachmentsTab.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAttachment(attachmentId?: number) {
    if (attachmentId == null || deletingAttachmentId != null) return;
    setDeletingAttachmentId(attachmentId);
    try {
      await updateMaterialRequestAttachments(detail.id, [{ id: attachmentId, is_deleted: true }]);
      toastSuccess(t("attachmentsTab.deletedToast"));
      await onSaved();
    } catch (error) {
      toastApiError(error, t("attachmentsTab.deleteError"));
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  const [movingAttachmentId, setMovingAttachmentId] = React.useState<number | null>(null);

  const handleMoveAttachment = React.useCallback(
    async (attachmentId: number, targetFolderId: number | null) => {
      if (movingAttachmentId != null) return;
      setMovingAttachmentId(attachmentId);
      try {
        await moveEntityAttachment(
          MATERIAL_REQUEST_PATHS.detail(detail.id),
          attachmentId,
          targetFolderId,
        );
        toastSuccess(t("attachmentsTab.movedToast"));
        await onSaved();
      } catch (error) {
        toastApiError(error, t("attachmentsTab.moveError"));
      } finally {
        setMovingAttachmentId(null);
      }
    },
    [detail.id, movingAttachmentId, onSaved, t],
  );

  const handleContainerDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files") || e.dataTransfer.types.includes("application/json")) {
      setIsDraggingOver(true);
    }
  };

  const handleContainerDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    setDragOverFolderId(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFileUpload(e.dataTransfer.files, activeFolderId);
    }
  };

  const handleFolderDragEnter = (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverFolderId !== folderId) {
      setDragOverFolderId(folderId);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverFolderId === folderId) {
      setDragOverFolderId(null);
    }
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    setDragOverFolderId(null);

    // Inward move: internal attachment drag → into folder
    const rawData = e.dataTransfer.getData("application/json");
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData) as { attachmentId?: unknown };
        if (typeof parsed.attachmentId === "number") {
          void handleMoveAttachment(parsed.attachmentId, folderId);
          return;
        }
      } catch {
        // Not an internal drag — fall through to file upload
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFileUpload(e.dataTransfer.files, folderId);
    }
  };

  const displayedFiles = activeFolderId != null
    ? (folderFilesMap.get(activeFolderId) ?? [])
    : unfiledFiles;

  const totalAttachmentsCount = attachments.length;
  const isEverythingEmpty = !foldersLoading && folders.length === 0 && totalAttachmentsCount === 0;

  return (
    <div className={detailTabBodyClassName}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void handleFileUpload(e.target.files)}
      />

      <section
        className={cn(
          detailTabSectionClassName,
          "relative min-h-[360px] transition-all",
          isDraggingOver && "ring-2 ring-dashed ring-[color:var(--dash-accent,#111111)] ring-offset-2",
        )}
        onDragEnter={handleContainerDragEnter}
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        onDrop={handleContainerDrop}
      >
        {isDraggingOver && dragOverFolderId == null && (
          <div className="pointer-events-none absolute inset-0 z-20 rounded-xl border-2 border-dashed border-[color:var(--dash-accent,#111111)] bg-[color:var(--dash-accent,#111111)]/[0.04]" />
        )}

        {uploading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
            <Loader2 className="size-8 animate-spin text-[color:var(--dash-accent,#111111)]" />
            <span className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              Uploading files…
            </span>
          </div>
        )}

        {/* Navigation Toolbar */}
        <div className={detailTabToolbarClassName}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {activeFolderId != null ? (
              <button
                type="button"
                onClick={() => setActiveFolderId(null)}
                title={t("folders.backToFolders")}
                aria-label={t("folders.backToFolders")}
                className="inline-flex size-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <ArrowLeft className="size-4" />
                <span className="sr-only">{t("folders.backToFolders")}</span>
              </button>
            ) : null}

            <div className="flex items-center gap-2 truncate">
              {activeFolder ? (
                <>
                  <Folder className="size-4 shrink-0 fill-[color:var(--dash-accent,#111111)] text-[color:var(--dash-accent,#111111)]" />
                  {isEditingFolderName ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={inlineRenameInputRef}
                        type="text"
                        value={inlineFolderName}
                        disabled={folderRenameSaving}
                        onChange={(e) => setInlineFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleSaveInlineFolderName();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setIsEditingFolderName(false);
                          }
                        }}
                        className="h-7 min-w-[120px] max-w-[220px] rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        disabled={folderRenameSaving || !inlineFolderName.trim()}
                        onClick={() => void handleSaveInlineFolderName()}
                        className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/50 dark:text-emerald-400"
                        title="Save"
                      >
                        {folderRenameSaving ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={folderRenameSaving}
                        onClick={() => setIsEditingFolderName(false)}
                        className="inline-flex size-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        title="Cancel"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startInlineFolderEdit}
                      className="group/folder-name inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={tCommon("edit")}
                    >
                      <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {activeFolder.name}
                      </span>
                      <Pencil className="size-3 text-slate-400 opacity-0 transition group-hover/folder-name:opacity-100 dark:text-slate-500" />
                    </button>
                  )}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {displayedFiles.length}
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t("attachmentsTab.title")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFolder ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleDeleteFolder(activeFolder)}
                  title={t("folders.deleteFolder")}
                  className="inline-flex size-8 items-center justify-center rounded-lg bg-transparent text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">{t("folders.deleteFolder")}</span>
                </button>
                <AppButton
                  type="button"
                  size="sm"
                  disabled={uploading}
                  onClick={triggerFileInput}
                  className="gap-1.5 text-xs"
                >
                  <Upload className="size-3.5" />
                  <span>{uploading ? "Uploading…" : t("folders.uploadToFolder")}</span>
                </AppButton>
              </>
            ) : (
              <>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openCreateFolderModal}
                  className="gap-1.5 text-xs"
                >
                  <FolderPlus className="size-3.5" />
                  <span>{t("folders.newFolder")}</span>
                </AppButton>
                <AppButton
                  type="button"
                  size="sm"
                  disabled={uploading}
                  onClick={triggerFileInput}
                  className="gap-1.5 text-xs"
                >
                  <Upload className="size-3.5" />
                  <span>{uploading ? "Uploading…" : t("attachmentsTab.addFiles")}</span>
                </AppButton>
              </>
            )}
          </div>
        </div>

        {activeFolderId == null && (
          <div className="space-y-6">
            {folders.length > 0 && (
              <div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 p-4">
                  {folders.map((folder) => {
                    const count = folderFilesMap.get(folder.id)?.length ?? 0;
                    return (
                      <div
                        key={folder.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveFolderId(folder.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveFolderId(folder.id);
                          }
                        }}
                        onDragEnter={(e) => handleFolderDragEnter(e, folder.id)}
                        onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                        onDragLeave={(e) => handleFolderDragLeave(e, folder.id)}
                        onDrop={(e) => handleFolderDrop(e, folder.id)}
                        className={cn(
                          "group relative flex flex-col items-center justify-between rounded-xl bg-transparent p-3 transition duration-150",
                          "hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
                          "cursor-pointer text-center",
                          dragOverFolderId === folder.id && [
                            "ring-2 ring-[color:var(--dash-accent,#111111)] bg-[color:var(--dash-accent,#111111)]/10 scale-105 shadow-md",
                          ],
                        )}
                      >
                        <div
                          className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRenameFolderModal(folder);
                            }}
                            title={t("folders.renameFolder")}
                            className="inline-flex size-6 items-center justify-center rounded-md bg-transparent text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
                          >
                            <Edit3 className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteFolder(folder);
                            }}
                            title={t("folders.deleteFolder")}
                            className="inline-flex size-6 items-center justify-center rounded-md bg-transparent text-slate-400 hover:bg-rose-100/60 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>

                        <div className="flex w-full items-center justify-center pt-2 pb-1">
                          <Folder
                            className="size-16 sm:size-20 fill-[color:var(--dash-accent,#111111)] text-[color:var(--dash-accent,#111111)] drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                            strokeWidth={1}
                          />
                        </div>

                        <div className="mt-2 w-full min-w-0">
                          <p
                            className="truncate text-sm font-semibold text-slate-800 transition-colors group-hover:text-[color:var(--dash-accent,#111111)] dark:text-slate-100"
                            title={folder.name}
                          >
                            {folder.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            {count === 1 ? "1 file" : `${count} files`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {unfiledFiles.length > 0 && (
              <div className="pt-1">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {folders.length > 0 ? t("folders.rootFiles") : t("attachmentsTab.title")} ({unfiledFiles.length})
                  </h3>
                </div>

                <div className="divide-y-0">
                  {unfiledFiles.map((att, idx) => (
                    <AttachmentRowItem
                      key={att.id ?? `unfiled-${idx}`}
                      attachment={att}
                      onDelete={() => void handleDeleteAttachment(att.id)}
                      deleting={deletingAttachmentId === att.id}
                      tDownload={t("attachmentsTab.download")}
                      tRemove={t("attachmentsTab.remove")}
                    />
                  ))}
                </div>
              </div>
            )}

            {isEverythingEmpty && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/90 py-16 text-center dark:border-slate-800/90">
                <Folder className="size-16 fill-[color:var(--dash-accent,#111111)] text-[color:var(--dash-accent,#111111)] opacity-80" strokeWidth={1} />
                <h3 className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">
                  {t("attachmentsTab.emptyTitle")}
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  {t("attachmentsTab.emptyDescription")}
                </p>
                <div className="mt-5 flex items-center justify-center gap-6">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={triggerFileInput}
                    className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-sm font-medium text-[color:var(--dash-accent,#111111)] underline underline-offset-4 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="size-4" />
                    <span>{uploading ? "Uploading…" : t("attachmentsTab.addFiles")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={openCreateFolderModal}
                    className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-sm font-medium text-slate-600 underline underline-offset-4 hover:opacity-80 transition-opacity cursor-pointer dark:text-slate-400"
                  >
                    <FolderPlus className="size-4" />
                    <span>{t("folders.newFolder")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeFolderId != null && (
          <div className="p-4">
            {displayedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
                <Folder className="size-16 fill-[color:var(--dash-accent,#111111)] text-[color:var(--dash-accent,#111111)] opacity-80" strokeWidth={1} />
                <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t("folders.emptyFolder")}
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={triggerFileInput}
                    className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-sm font-medium text-[color:var(--dash-accent,#111111)] underline underline-offset-4 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="size-4" />
                    <span>{uploading ? "Uploading…" : t("folders.uploadToFolder")}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y-0">
                {displayedFiles.map((att, idx) => (
                  <AttachmentRowItem
                    key={att.id ?? `folder-file-${idx}`}
                    attachment={att}
                    onDelete={() => void handleDeleteAttachment(att.id)}
                    deleting={deletingAttachmentId === att.id}
                    tDownload={t("attachmentsTab.download")}
                    tRemove={t("attachmentsTab.remove")}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <AppModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        title={
          folderModalMode === "create"
            ? t("folders.createFolder")
            : t("folders.renameFolder")
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={folderModalBusy}
              onClick={() => setFolderModalOpen(false)}
            >
              {tCommon("cancel")}
            </AppButton>
            <AppButton
              type="button"
              size="sm"
              disabled={folderModalBusy || !folderNameInput.trim()}
              onClick={() => void handleFolderModalSubmit()}
            >
              {folderModalBusy
                ? "Saving…"
                : folderModalMode === "create"
                  ? t("folders.createFolder")
                  : tCommon("save")}
            </AppButton>
          </div>
        }
      >
        <form onSubmit={(e) => void handleFolderModalSubmit(e)} className="space-y-3 py-1">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            {t("folders.folderName")}
          </label>
          <input
            type="text"
            autoFocus
            value={folderNameInput}
            onChange={(e) => setFolderNameInput(e.target.value)}
            placeholder={t("folders.folderNamePlaceholder")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[color:var(--dash-accent,#0284c7)] focus:ring-1 focus:ring-[color:var(--dash-accent,#0284c7)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </form>
      </AppModal>
    </div>
  );
}

function AttachmentRowItem({
  attachment,
  onDelete,
  deleting,
  tDownload,
  tRemove,
}: {
  attachment: EntityAttachment;
  onDelete: () => void;
  deleting: boolean;
  tDownload: string;
  tRemove: string;
}) {
  const [downloading, setDownloading] = React.useState(false);

  const url =
    attachment.file ||
    attachment.file_url ||
    attachment.attachment ||
    attachment.url ||
    "#";
  const name =
    attachment.file_name ||
    (typeof attachment.file === "string" ? attachment.file.split("/").pop() : null) ||
    "Attachment";
  const sizeText = formatFileSize(attachment.file_size);
  const createdDate = attachment.created_at
    ? new Date(attachment.created_at).toLocaleDateString()
    : null;

  async function handleDownload() {
    if (downloading || !url || url === "#") return;
    setDownloading(true);
    try {
      await downloadAttachmentFile(url, name);
    } catch {
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      draggable={attachment.id != null}
      onDragStart={(e) => {
        if (attachment.id != null) {
          e.dataTransfer.setData(
            "application/json",
            JSON.stringify({ attachmentId: attachment.id }),
          );
          e.dataTransfer.effectAllowed = "move";
        }
      }}
      className={cn(
        "group flex items-center justify-between gap-3 border-b border-slate-200/80 px-2 py-2 transition-colors hover:bg-slate-50/70 dark:border-slate-800/80 dark:hover:bg-slate-800/40",
        attachment.id != null && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {getFileIcon(attachment.content_type_value, name)}
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
          <a
            draggable={false}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs sm:text-sm font-medium text-slate-800 hover:text-[color:var(--dash-accent,#0284c7)] hover:underline dark:text-slate-100"
          >
            {name}
          </a>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            {sizeText !== "—" ? <span>{sizeText}</span> : null}
            {sizeText !== "—" && createdDate ? <span>•</span> : null}
            {createdDate ? <span>{createdDate}</span> : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
        {url !== "#" ? (
          <button
            type="button"
            disabled={downloading}
            onClick={() => void handleDownload()}
            title={tDownload}
            className="inline-flex size-7 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin text-[color:var(--dash-accent,#0284c7)]" />
            ) : (
              <Download className="size-3.5" />
            )}
          </button>
        ) : null}
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          title={tRemove}
          className="inline-flex size-7 items-center justify-center rounded text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
