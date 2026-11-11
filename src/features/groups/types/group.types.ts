import type { ProjectPagination } from "@/features/projects/types/project.types";
import type { EntityAttachment } from "@/shared/attachments/entity-attachment.types";

export type GroupUserRef = {
  id: number;
  email: string;
  username: string;
};

export type GroupItemComponentRef = {
  id?: number;
  child_item: number;
  child_name?: string | null;
  quantity?: number | null;
};

export type GroupItemRef = {
  id?: number;
  item: number;
  abbreviation: string;
  item_name?: string;
  item_selling_price?: string | number | null;
  selling_price?: string | number | null;
  item_attachments?: EntityAttachment[] | null;
  /** Nested on group list/detail payloads — prefer this over a separate composite fetch. */
  components?: GroupItemComponentRef[];
};

export type GroupParentRef = {
  id: number;
  name?: string | null;
};

/** Nested subgroup returned on parent group detail. */
export type GroupSubgroup = {
  id: number;
  name: string;
  items?: GroupItemRef[];
  is_parent?: boolean;
  parent?: number | GroupParentRef | null;
  is_active?: boolean;
};

export type Group = {
  id: number;
  created_by: GroupUserRef | null;
  modified_by: GroupUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  is_active: boolean;
  /** True for top-level / parent groups. */
  is_parent?: boolean;
  /** Parent group id or nested object when returned by the API. */
  parent?: number | GroupParentRef | null;
  deleted_by: unknown;
  organization: number;
  items?: GroupItemRef[];
  subgroups?: GroupSubgroup[];
  attachments?: EntityAttachment[] | null;
};

export type GroupCreatePayload = {
  name: string;
  items?: GroupItemRef[];
  /** Optional parent group id. */
  parent?: number;
  is_parent?: boolean;
};

export type GroupUpdatePayload = {
  name?: string;
  items?: GroupItemRef[];
  parent?: number | null;
  is_parent?: boolean;
};

export type GroupListResponse = {
  success: boolean;
  message: string;
  data: Group[];
  pagination: ProjectPagination;
};
