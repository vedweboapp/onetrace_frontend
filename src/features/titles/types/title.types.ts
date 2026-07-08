export type TitleUserRef = {
  id: number;
  email: string;
  username: string;
};

export type Title = {
  id: number;
  created_by: TitleUserRef | null;
  modified_by: TitleUserRef | null;
  created_at: string;
  modified_at: string;
  updated_at?: string;
  deleted_at: string | null;
  is_deleted: boolean;
  title: string;
  deleted_by: unknown;
  organization?: number;
  /** Legacy API key; normalized into `title` on read. */
  site_title?: string;
  /** Present on some API rows; not shown or edited in settings UI. */
  is_active?: boolean;
  bg_color?: string;
  text_color?: string;
  bg_colour?: string;
  text_colour?: string;
};

export type TitlePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type TitleListResponse = {
  success: boolean;
  message: string;
  data: Title[];
  pagination: TitlePagination;
};

export type TitleCreatePayload = {
  title: string;
};

export type TitleUpdatePayload = {
  title?: string;
};
