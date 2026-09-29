import { USER_GROUP_PATHS } from "@/features/user-groups/api/user-group.paths";
import type {
  UserGroup,
  UserGroupCreatePayload,
  UserGroupListResponse,
  UserGroupUpdatePayload,
  UserGroupUserRef,
} from "@/features/user-groups/types/user-group.types";
import { emitMockApiNetworkRequest } from "@/shared/config/mock-api-network.util";

type UserGroupListFilters = {
  search?: string;
};

const STORAGE_KEY = "onetrace_mock_user_groups_v1";

function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readAll(): UserGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserGroup[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: UserGroup[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function nextId(rows: UserGroup[]): number {
  const max = rows.reduce((m, r) => Math.max(m, r.id), 0);
  return max + 1;
}

function toMembers(userIds: number[]): UserGroupUserRef[] {
  return userIds.filter((id) => Number.isFinite(id) && id > 0).map((id) => ({ id }));
}

function toWritePayload(body: UserGroupCreatePayload | UserGroupUpdatePayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.name === "string") out.name = body.name;
  if (Array.isArray(body.users)) out.users = body.users;
  return out;
}

function paginate(
  rows: UserGroup[],
  page: number,
  pageSize: number,
): { items: UserGroup[]; pagination: UserGroupListResponse["pagination"] } {
  const total_records = rows.length;
  const total_pages = Math.max(1, Math.ceil(total_records / pageSize));
  const current_page = Math.min(Math.max(1, page), total_pages);
  const start = (current_page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    pagination: {
      total_records,
      total_pages,
      current_page,
      page_size: pageSize,
      next: current_page < total_pages ? String(current_page + 1) : null,
      previous: current_page > 1 ? String(current_page - 1) : null,
    },
  };
}

export async function fetchUserGroupsPage(
  page = 1,
  pageSize = 20,
  filters?: UserGroupListFilters,
): Promise<{ items: UserGroup[]; pagination: UserGroupListResponse["pagination"] }> {
  await emitMockApiNetworkRequest({
    method: "get",
    path: USER_GROUP_PATHS.list,
    params: {
      page,
      page_size: pageSize,
      search: filters?.search?.trim() || undefined,
    },
  });
  await delay();
  let rows = readAll();
  const q = filters?.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => row.name.toLowerCase().includes(q));
  }
  rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  return paginate(rows, page, pageSize);
}

export async function fetchUserGroup(id: number): Promise<UserGroup> {
  await emitMockApiNetworkRequest({ method: "get", path: USER_GROUP_PATHS.detail(id) });
  await delay(80);
  const row = readAll().find((r) => r.id === id);
  if (!row) throw new Error("User group not found");
  return row;
}

export async function createUserGroup(body: UserGroupCreatePayload): Promise<UserGroup> {
  await emitMockApiNetworkRequest({
    method: "post",
    path: USER_GROUP_PATHS.list,
    data: toWritePayload(body),
  });
  await delay(180);
  const rows = readAll();
  const now = new Date().toISOString();
  const row: UserGroup = {
    id: nextId(rows),
    name: body.name.trim(),
    users: toMembers(body.users),
    created_by: null,
    modified_by: null,
    created_at: now,
    modified_at: now,
    is_active: true,
    organization: null,
  };
  writeAll([...rows, row]);
  return row;
}

export async function updateUserGroup(id: number, body: UserGroupUpdatePayload): Promise<UserGroup> {
  await emitMockApiNetworkRequest({
    method: "patch",
    path: USER_GROUP_PATHS.detail(id),
    data: toWritePayload(body),
  });
  await delay(150);
  const rows = readAll();
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error("User group not found");
  const current = rows[index]!;
  const updated: UserGroup = {
    ...current,
    name: typeof body.name === "string" ? body.name.trim() : current.name,
    users: Array.isArray(body.users) ? toMembers(body.users) : current.users,
    modified_at: new Date().toISOString(),
  };
  const next = [...rows];
  next[index] = updated;
  writeAll(next);
  return updated;
}

export async function deleteUserGroup(id: number): Promise<void> {
  await emitMockApiNetworkRequest({ method: "delete", path: USER_GROUP_PATHS.detail(id) });
  await delay(120);
  writeAll(readAll().filter((r) => r.id !== id));
}
