export type ChecklistTypeUserRef = {
  id: number;
  email: string;
  username: string;
};

export type ChecklistTypeProjectTypeRef = {
  id: number;
  project_type?: string | null;
  name?: string | null;
  is_active?: boolean;
};

export type ChecklistType = {
  id: number;
  created_by: ChecklistTypeUserRef | null;
  modified_by: ChecklistTypeUserRef | null;
  created_at: string;
  modified_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  title: string | null;
  sequence: number;
  is_required: boolean;
  is_active: boolean;
  deleted_by: unknown;
  organization?: number;
  project_type: ChecklistTypeProjectTypeRef | number | null;
  project_type_name?: string | null;
  file?: string | null;
  concentric_point?: boolean; 
};

export type ChecklistTypePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type ChecklistTypeListResponse = {
  success: boolean;
  message: string;
  data: ChecklistType[];
  pagination: ChecklistTypePagination;
};

export type ChecklistTypeCreatePayload = {
  title: string;
  project_type: number;
  sequence?: number;
  is_required?: boolean;
};

export type ChecklistTypeUpdatePayload = Partial<ChecklistTypeCreatePayload> & {
  is_active?: boolean;
};
