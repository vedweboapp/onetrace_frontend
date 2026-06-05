import type { MaterialRequestExtraDispatchItem } from "@/features/material-requests/types/material-request-dispatch.types";
import type {
  MaterialRequestDetail,
  MaterialRequestLogEntry,
} from "@/features/material-requests/types/material-request.types";

export type MaterialRequestMockRecord = {
  statusOverride?: string;
  lineDispatched: Record<string, number>;
  lineRestocked: Record<string, number>;
  extraItems: MaterialRequestExtraDispatchItem[];
  logs: MaterialRequestLogEntry[];
  dispatchIds: number[];
  /** Mock inventory credits from restock (item id → units returned). */
  inventoryCredits: Record<string, number>;
};

type MockDatabase = {
  nextId: number;
  entities: Record<string, MaterialRequestDetail>;
  records: Record<string, MaterialRequestMockRecord>;
};

const globalForMock = globalThis as typeof globalThis & {
  __onetraceMaterialRequestMockDb?: MockDatabase;
};

function emptyRecord(): MaterialRequestMockRecord {
  return {
    lineDispatched: {},
    lineRestocked: {},
    extraItems: [],
    logs: [],
    dispatchIds: [],
    inventoryCredits: {},
  };
}

function emptyDb(): MockDatabase {
  return { nextId: 1, entities: {}, records: {} };
}

function readDb(): MockDatabase {
  if (!globalForMock.__onetraceMaterialRequestMockDb) {
    globalForMock.__onetraceMaterialRequestMockDb = emptyDb();
  }
  return globalForMock.__onetraceMaterialRequestMockDb;
}

function writeDb(db: MockDatabase) {
  globalForMock.__onetraceMaterialRequestMockDb = db;
}

export function allocateMaterialRequestMockId(): number {
  const db = readDb();
  const id = db.nextId;
  db.nextId += 1;
  writeDb(db);
  return id;
}

export function upsertMaterialRequestMockEntity(detail: MaterialRequestDetail) {
  const db = readDb();
  db.entities[String(detail.id)] = detail;
  if (detail.id >= db.nextId) {
    db.nextId = detail.id + 1;
  }
  writeDb(db);
}

export function getMaterialRequestMockEntity(id: number): MaterialRequestDetail | null {
  const db = readDb();
  return db.entities[String(id)] ?? null;
}

export function listMaterialRequestMockEntities(): MaterialRequestDetail[] {
  const db = readDb();
  return Object.values(db.entities).sort((a, b) => b.id - a.id);
}

export function getMaterialRequestMockRecord(id: number): MaterialRequestMockRecord {
  const db = readDb();
  return db.records[String(id)] ?? emptyRecord();
}

export function saveMaterialRequestMockRecord(id: number, record: MaterialRequestMockRecord) {
  const db = readDb();
  db.records[String(id)] = record;
  writeDb(db);
}
