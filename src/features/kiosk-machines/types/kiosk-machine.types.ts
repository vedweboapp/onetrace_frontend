export type KioskMachineUserRef = {
  id: number;
  email?: string | null;
  username?: string | null;
};

export type KioskMachine = {
  id: number;
  created_by: KioskMachineUserRef | null;
  modified_by: KioskMachineUserRef | null;
  created_at: string;
  modified_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  machine_code: string;
  machine_name: string;
  city: string | null;
  location_name: string | null;
  activation_token: string | null;
  app_version: string | null;
  last_seen_at: string | null;
  is_active: boolean;
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
  secret_key: string | null;
  is_activated: boolean;
  deleted_by: unknown;
  organization?: number | null;
};

export type KioskMachinePagination = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

export type KioskMachineListResponse = {
  success: boolean;
  message: string;
  data: KioskMachine[];
  pagination: KioskMachinePagination;
};

export type KioskMachineCreatePayload = {
  machine_code: string;
  machine_name: string;
  city?: string | null;
  location_name?: string | null;
};

export type KioskMachineUpdatePayload = Partial<KioskMachineCreatePayload> & {
  is_active?: boolean;
};

export type KioskMachineActivatePayload = {
  pairing_code: string;
  organization_id: number;
};

export type KioskMachineActivateResponse = {
  message?: string;
  success?: boolean;
};
