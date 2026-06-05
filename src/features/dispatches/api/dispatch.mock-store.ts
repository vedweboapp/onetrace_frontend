import type { DispatchDetail } from "@/features/dispatches/types/dispatch.types";

type DispatchMockDatabase = {
  nextId: number;
  entities: Record<string, DispatchDetail>;
};

const globalForMock = globalThis as typeof globalThis & {
  __onetraceDispatchMockDb?: DispatchMockDatabase;
};

function emptyDb(): DispatchMockDatabase {
  return { nextId: 1, entities: {} };
}

function readDb(): DispatchMockDatabase {
  if (!globalForMock.__onetraceDispatchMockDb) {
    globalForMock.__onetraceDispatchMockDb = emptyDb();
  }
  return globalForMock.__onetraceDispatchMockDb;
}

function writeDb(db: DispatchMockDatabase) {
  globalForMock.__onetraceDispatchMockDb = db;
}

export function allocateDispatchMockId(): number {
  const db = readDb();
  const id = db.nextId;
  db.nextId += 1;
  writeDb(db);
  return id;
}

export function upsertDispatchMockEntity(detail: DispatchDetail) {
  const db = readDb();
  db.entities[String(detail.id)] = detail;
  if (detail.id >= db.nextId) db.nextId = detail.id + 1;
  writeDb(db);
}

export function getDispatchMockEntity(id: number): DispatchDetail | null {
  return readDb().entities[String(id)] ?? null;
}

export function listDispatchMockEntities(): DispatchDetail[] {
  return Object.values(readDb().entities).sort((a, b) => b.id - a.id);
}

export function listDispatchesByMaterialRequestId(materialRequestId: number): DispatchDetail[] {
  return listDispatchMockEntities().filter((row) => row.material_request_id === materialRequestId);
}
