import type { VendorType } from "@/features/vendor-types/types/vendor-type.types";

type MockDatabase = {
  nextId: number;
  entities: Record<string, VendorType>;
  seeded: boolean;
};

const globalForMock = globalThis as typeof globalThis & {
  __onetraceVendorTypeMockDb?: MockDatabase;
};

function emptyDb(): MockDatabase {
  return { nextId: 1, entities: {}, seeded: false };
}

function readDb(): MockDatabase {
  if (!globalForMock.__onetraceVendorTypeMockDb) {
    globalForMock.__onetraceVendorTypeMockDb = emptyDb();
  }
  return globalForMock.__onetraceVendorTypeMockDb;
}

function writeDb(db: MockDatabase) {
  globalForMock.__onetraceVendorTypeMockDb = db;
}

export function allocateVendorTypeMockId(): number {
  const db = readDb();
  const id = db.nextId;
  db.nextId += 1;
  writeDb(db);
  return id;
}

export function upsertVendorTypeMockEntity(row: VendorType) {
  const db = readDb();
  db.entities[String(row.id)] = row;
  if (row.id >= db.nextId) db.nextId = row.id + 1;
  writeDb(db);
}

export function getVendorTypeMockEntity(id: number): VendorType | null {
  return readDb().entities[String(id)] ?? null;
}

export function listVendorTypeMockEntities(): VendorType[] {
  return Object.values(readDb().entities).sort((a, b) => a.id - b.id);
}

export function deleteVendorTypeMockEntity(id: number): boolean {
  const db = readDb();
  if (!db.entities[String(id)]) return false;
  delete db.entities[String(id)];
  writeDb(db);
  return true;
}

export function isVendorTypeMockSeeded(): boolean {
  return readDb().seeded;
}

export function markVendorTypeMockSeeded() {
  const db = readDb();
  db.seeded = true;
  writeDb(db);
}
