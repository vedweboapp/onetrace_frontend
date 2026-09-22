import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import {
  applyDropdownListParam,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
import { KIOSK_MACHINE_PATHS } from "./kiosk-machine.paths";
import type {
  KioskMachine,
  KioskMachineActivatePayload,
  KioskMachineActivateResponse,
  KioskMachineCreatePayload,
  KioskMachineListResponse,
  KioskMachineUpdatePayload,
} from "../types/kiosk-machine.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function normalizeMachine(row: KioskMachine): KioskMachine {
  return {
    ...row,
    machine_code: row.machine_code?.trim() ?? "",
    machine_name: row.machine_name?.trim() ?? "",
    city: row.city?.trim() || null,
    location_name: row.location_name?.trim() || null,
  };
}

function toWritePayload(
  body: KioskMachineCreatePayload | KioskMachineUpdatePayload,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.machine_code === "string") out.machine_code = body.machine_code.trim();
  if (typeof body.machine_name === "string") out.machine_name = body.machine_name.trim();
  if ("city" in body) out.city = body.city?.trim() || null;
  if ("location_name" in body) out.location_name = body.location_name?.trim() || null;
  if ("is_active" in body && typeof body.is_active === "boolean") out.is_active = body.is_active;
  return out;
}

export type KioskMachineListFilters = {
  search?: string;
  dropdown?: boolean;
};

export async function fetchKioskMachinesPage(
  page = 1,
  pageSize = 20,
  filters?: KioskMachineListFilters,
): Promise<{ items: KioskMachine[]; pagination: KioskMachineListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    fetchFirst: async () => {
      const { data } = await api.get<KioskMachineListResponse>(KIOSK_MACHINE_PATHS.list, { params });
      const pageData = parseListApiPage<KioskMachine>(data, pageSize);
      return {
        items: pageData.items.map(normalizeMachine),
        pagination: pageData.pagination as never,
      };
    },
  });
}

export async function fetchKioskMachine(id: number): Promise<KioskMachine> {
  const { data } = await api.get<ApiEnvelope<KioskMachine>>(KIOSK_MACHINE_PATHS.detail(id));
  assertApiSuccess(data);
  return normalizeMachine(data.data);
}

export async function createKioskMachine(body: KioskMachineCreatePayload): Promise<KioskMachine> {
  const { data } = await api.post<ApiEnvelope<KioskMachine>>(
    KIOSK_MACHINE_PATHS.list,
    toWritePayload(body),
  );
  assertApiSuccess(data);
  return normalizeMachine(data.data);
}

export async function updateKioskMachine(
  id: number,
  body: KioskMachineUpdatePayload,
): Promise<KioskMachine> {
  const { data } = await api.put<ApiEnvelope<KioskMachine>>(
    KIOSK_MACHINE_PATHS.detail(id),
    toWritePayload(body),
  );
  assertApiSuccess(data);
  return normalizeMachine(data.data);
}

export async function deleteKioskMachine(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(KIOSK_MACHINE_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}

export async function activateKioskMachine(
  body: KioskMachineActivatePayload,
): Promise<string> {
  const { data } = await api.post<KioskMachineActivateResponse>(KIOSK_MACHINE_PATHS.activate, {
    pairing_code: body.pairing_code.trim(),
    organization_id: body.organization_id,
  });
  if (data && typeof data.success === "boolean" && !data.success) {
    const msg = typeof data.message === "string" ? data.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
  return typeof data?.message === "string" && data.message.trim()
    ? data.message.trim()
    : "Kiosk machine activated successfully.";
}
