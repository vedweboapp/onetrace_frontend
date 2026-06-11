import type { Vendor } from "@/features/vendors/types/vendor.types";

type MockDatabase = {
  nextId: number;
  nextAddressId: number;
  entities: Record<string, Vendor>;
  seeded: boolean;
};

const globalForMock = globalThis as typeof globalThis & {
  __onetraceVendorMockDb?: MockDatabase;
};

function emptyDb(): MockDatabase {
  return { nextId: 1, nextAddressId: 1, entities: {}, seeded: false };
}

function readDb(): MockDatabase {
  if (!globalForMock.__onetraceVendorMockDb) {
    globalForMock.__onetraceVendorMockDb = emptyDb();
  }
  return globalForMock.__onetraceVendorMockDb;
}

function writeDb(db: MockDatabase) {
  globalForMock.__onetraceVendorMockDb = db;
}

export function allocateVendorMockId(): number {
  const db = readDb();
  const id = db.nextId;
  db.nextId += 1;
  writeDb(db);
  return id;
}

export function allocateVendorAddressMockId(): number {
  const db = readDb();
  const id = db.nextAddressId;
  db.nextAddressId += 1;
  writeDb(db);
  return id;
}

export function upsertVendorMockEntity(row: Vendor) {
  const db = readDb();
  db.entities[String(row.id)] = row;
  if (row.id >= db.nextId) db.nextId = row.id + 1;
  for (const addr of row.addresses) {
    if (addr.id != null && addr.id >= db.nextAddressId) db.nextAddressId = addr.id + 1;
  }
  writeDb(db);
}

export function getVendorMockEntity(id: number): Vendor | null {
  return readDb().entities[String(id)] ?? null;
}

export function listVendorMockEntities(): Vendor[] {
  return Object.values(readDb().entities).sort((a, b) => b.id - a.id);
}

export function deleteVendorMockEntity(id: number): boolean {
  const db = readDb();
  if (!db.entities[String(id)]) return false;
  delete db.entities[String(id)];
  writeDb(db);
  return true;
}

export function isVendorMockSeeded(): boolean {
  return readDb().seeded;
}

export function markVendorMockSeeded() {
  const db = readDb();
  db.seeded = true;
  writeDb(db);
}
