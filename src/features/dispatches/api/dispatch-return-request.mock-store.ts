import type { DispatchReturnRequest } from "@/features/dispatches/types/dispatch.types";

type ReturnRequestMockDatabase = {
  nextId: number;
  entities: Record<string, DispatchReturnRequest>;
};

const globalForMock = globalThis as typeof globalThis & {
  __onetraceDispatchReturnRequestMockDb?: ReturnRequestMockDatabase;
};

function emptyDb(): ReturnRequestMockDatabase {
  return { nextId: 1, entities: {} };
}

function readDb(): ReturnRequestMockDatabase {
  if (!globalForMock.__onetraceDispatchReturnRequestMockDb) {
    globalForMock.__onetraceDispatchReturnRequestMockDb = emptyDb();
  }
  return globalForMock.__onetraceDispatchReturnRequestMockDb;
}

function writeDb(db: ReturnRequestMockDatabase) {
  globalForMock.__onetraceDispatchReturnRequestMockDb = db;
}

export function allocateDispatchReturnRequestMockId(): number {
  const db = readDb();
  const id = db.nextId;
  db.nextId += 1;
  writeDb(db);
  return id;
}

export function upsertDispatchReturnRequestMock(request: DispatchReturnRequest) {
  const db = readDb();
  db.entities[String(request.id)] = request;
  if (request.id >= db.nextId) db.nextId = request.id + 1;
  writeDb(db);
}

export function getDispatchReturnRequestMock(id: number): DispatchReturnRequest | null {
  return readDb().entities[String(id)] ?? null;
}

export function listDispatchReturnRequestMocks(): DispatchReturnRequest[] {
  return Object.values(readDb().entities).sort((a, b) => b.id - a.id);
}
