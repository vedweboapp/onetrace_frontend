export type UnitTypeUserRef = {
  id: number;
  email: string;
  username: string;
};

export type UnitType = {
  id: number;
  created_by: UnitTypeUserRef | null;
  modified_by: UnitTypeUserRef | null;
  created_at: string;
  modified_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  /** Abbreviation shown in composite items (e.g. "kg"). */
  short_form?: string | null;
  is_system_generated: boolean;
  is_active: boolean;
  deleted_by: unknown;
  organization: number | null;
};

export type UnitTypePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};
  

export type UnitTypeListResponse = {
  success: boolean;
  message: string;
  data: UnitType[];
  pagination: UnitTypePagination;
};

export type UnitTypeCreatePayload = {
  name: string;
  short_form?: string | null;
};

export type UnitTypeUpdatePayload = Partial<UnitTypeCreatePayload> & {
  is_active?: boolean;
};
