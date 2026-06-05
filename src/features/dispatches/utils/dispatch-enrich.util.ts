import { fetchUsersPage } from "@/features/users/api/user.api";
import { userProfileLabel } from "@/features/jobs/utils/job-nested-fields.util";
import type {
  DispatchDetail,
  DispatchListItem,
  DispatchUserRef,
  DispatchWorkerRef,
} from "@/features/dispatches/types/dispatch.types";

export const DEFAULT_MOCK_DISPATCH_USER: DispatchUserRef = {
  id: 1,
  name: "Admin",
  email: "admin@yopmail.com",
  username: "admin",
};

export function resolveMockDispatchedBy(authHeader?: string | null): DispatchUserRef {
  void authHeader;
  return DEFAULT_MOCK_DISPATCH_USER;
}

let userLabelCache: Record<number, string> | null = null;

export async function loadDispatchUserLabelById(): Promise<Record<number, string>> {
  if (userLabelCache) return userLabelCache;
  try {
    const { items } = await fetchUsersPage(1, 500);
    const map: Record<number, string> = {};
    for (const u of items) {
      map[u.user_detail.id] = userProfileLabel(u);
    }
    userLabelCache = map;
    return map;
  } catch {
    return {};
  }
}

export function normalizeDispatchWorkerRef(
  worker: DispatchDetail["worker_name"],
  labels: Record<number, string>,
): DispatchWorkerRef | null {
  if (worker == null) return null;
  if (typeof worker === "object") {
    const name =
      worker.name?.trim() ||
      labels[worker.id] ||
      worker.username?.trim() ||
      worker.email?.trim() ||
      null;
    return { ...worker, name: name ?? worker.name ?? null };
  }
  if (typeof worker === "number" && worker > 0) {
    return { id: worker, name: labels[worker] ?? null };
  }
  return null;
}

export function normalizeDispatchUserRef(
  user: DispatchUserRef | number | null | undefined,
  labels: Record<number, string>,
): DispatchUserRef | null {
  if (user == null) return null;
  if (typeof user === "number" && user > 0) {
    return { id: user, name: labels[user] ?? null };
  }
  if (typeof user !== "object") return null;
  const name =
    user.name?.trim() ||
    labels[user.id] ||
    user.username?.trim() ||
    user.email?.trim() ||
    null;
  return { ...user, name: name ?? user.name ?? null };
}

export async function enrichDispatchDetail(detail: DispatchDetail): Promise<DispatchDetail> {
  const labels = await loadDispatchUserLabelById();
  const worker = normalizeDispatchWorkerRef(detail.worker_name, labels);
  const dispatchedBy = normalizeDispatchUserRef(detail.dispatched_by ?? detail.created_by, labels);
  return {
    ...detail,
    worker_name: worker,
    dispatched_by: dispatchedBy,
    created_by: normalizeDispatchUserRef(detail.created_by, labels),
    modified_by: normalizeDispatchUserRef(detail.modified_by, labels),
    lines: detail.lines.map((line) => ({
      ...line,
      worker_name: normalizeDispatchWorkerRef(line.worker_name ?? detail.worker_name, labels),
    })),
  };
}

export async function enrichDispatchListItem(row: DispatchListItem): Promise<DispatchListItem> {
  const labels = await loadDispatchUserLabelById();
  return {
    ...row,
    worker_name: normalizeDispatchWorkerRef(row.worker_name, labels),
  };
}
