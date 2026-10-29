/** File attached to an entity (`attachments` on read / multipart write). */
export type EntityAttachment = {
  id?: number;
  /** Absolute or relative media URL from the API. */
  file?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  content_type_value?: string | null;
  /** Legacy aliases */
  attachment?: string | null;
  file_url?: string | null;
  url?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
};

export type EntityAttachmentWriteRef =
  | { id: number; is_deleted: true }
  | { file: File };
