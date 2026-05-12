export type TagUserRef = {
  id: number;
  email: string;
  username: string;
};

export type Tag = {
  id: number;
  uuid?: string;
  created_by: TagUserRef | null;
  modified_by: TagUserRef | null;
  created_at: string;
  modified_at: string;
  name?: string;
  tag_name?: string;
  bg_color?: string;
  text_color?: string;
  bg_colour?: string;
  text_colour?: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  is_active?: boolean;
  deleted_by?: unknown;
  organization?: number;
};

export type TagPagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type TagListResponse = {
  success: boolean;
  message: string;
  data: Tag[];
  pagination: TagPagination;
};

export type TagCreatePayload = {
  name: string;
  bg_colour: string;
  text_colour: string;
};

export type TagUpdatePayload = Partial<TagCreatePayload>;
