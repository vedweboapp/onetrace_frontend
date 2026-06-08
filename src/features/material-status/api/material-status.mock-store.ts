import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";

type MaterialStatusMockDatabase = {
  nextId: number;
  entities: Record<string, WorkflowColourStatus>;
  seeded: boolean;
};

const globalForMock = globalThis as typeof globalThis & {
  __onetraceMaterialStatusMockDb?: MaterialStatusMockDatabase;
};

const DEFAULT_USER = {
  id: 1,
  email: "admin@yopmail.com",
  username: "admin",
};

const DEFAULT_STATUSES: Array<Pick<WorkflowColourStatus, "status_name" | "bg_colour" | "text_colour">> = [
  { status_name: "Draft", bg_colour: "#E0F2FE", text_colour: "#0369A1" },
  { status_name: "Pending", bg_colour: "#F1F5F9", text_colour: "#475569" },
  { status_name: "Partially Dispatched", bg_colour: "#FEF3C7", text_colour: "#B45309" },
  { status_name: "Dispatched", bg_colour: "#D1FAE5", text_colour: "#047857" },
];

function emptyDb(): MaterialStatusMockDatabase {
  return { nextId: 1, entities: {}, seeded: false };
}

function readDb(): MaterialStatusMockDatabase {
  if (!globalForMock.__onetraceMaterialStatusMockDb) {
    globalForMock.__onetraceMaterialStatusMockDb = emptyDb();
  }
  return globalForMock.__onetraceMaterialStatusMockDb;
}

function writeDb(db: MaterialStatusMockDatabase) {
  globalForMock.__onetraceMaterialStatusMockDb = db;
}

function seedDefaults(db: MaterialStatusMockDatabase): MaterialStatusMockDatabase {
  if (db.seeded) return db;
  const now = new Date().toISOString();
  const entities: Record<string, WorkflowColourStatus> = {};
  DEFAULT_STATUSES.forEach((row, index) => {
    const id = index + 1;
    entities[String(id)] = {
      id,
      created_by: DEFAULT_USER,
      modified_by: null,
      created_at: now,
      modified_at: now,
      deleted_at: null,
      is_deleted: false,
      is_active: true,
      deleted_by: null,
      organization: 1,
      status_name: row.status_name,
      bg_colour: row.bg_colour,
      text_colour: row.text_colour,
    };
  });
  return { ...db, nextId: DEFAULT_STATUSES.length + 1, entities, seeded: true };
}

export function ensureMaterialStatusMockDb(): MaterialStatusMockDatabase {
  const db = seedDefaults(readDb());
  writeDb(db);
  return db;
}

export function allocateMaterialStatusMockId(): number {
  const db = ensureMaterialStatusMockDb();
  const id = db.nextId;
  db.nextId += 1;
  writeDb(db);
  return id;
}

export function upsertMaterialStatusMockEntity(row: WorkflowColourStatus) {
  const db = ensureMaterialStatusMockDb();
  db.entities[String(row.id)] = row;
  if (row.id >= db.nextId) db.nextId = row.id + 1;
  writeDb(db);
}

export function getMaterialStatusMockEntity(id: number): WorkflowColourStatus | null {
  return ensureMaterialStatusMockDb().entities[String(id)] ?? null;
}

export function listMaterialStatusMockEntities(): WorkflowColourStatus[] {
  return Object.values(ensureMaterialStatusMockDb().entities).sort((a, b) => b.id - a.id);
}

export function deleteMaterialStatusMockEntity(id: number): boolean {
  const db = ensureMaterialStatusMockDb();
  if (!db.entities[String(id)]) return false;
  delete db.entities[String(id)];
  writeDb(db);
  return true;
}
