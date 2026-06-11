import type { PurchaseOrderDetail } from "@/features/purchase-orders/types/purchase-order.types";

type MockDatabase = {
  nextId: number;
  entities: Record<string, PurchaseOrderDetail>;
  seeded: boolean;
};

const globalForMock = globalThis as typeof globalThis & {
  __onetracePurchaseOrderMockDb?: MockDatabase;
};

function emptyDb(): MockDatabase {
  return { nextId: 1, entities: {}, seeded: false };
}

function readDb(): MockDatabase {
  if (!globalForMock.__onetracePurchaseOrderMockDb) {
    globalForMock.__onetracePurchaseOrderMockDb = emptyDb();
  }
  return globalForMock.__onetracePurchaseOrderMockDb;
}

function writeDb(db: MockDatabase) {
  globalForMock.__onetracePurchaseOrderMockDb = db;
}

export function allocatePurchaseOrderMockId(): number {
  const db = readDb();
  const id = db.nextId;
  db.nextId += 1;
  writeDb(db);
  return id;
}

export function upsertPurchaseOrderMockEntity(row: PurchaseOrderDetail) {
  const db = readDb();
  db.entities[String(row.id)] = row;
  if (row.id >= db.nextId) db.nextId = row.id + 1;
  writeDb(db);
}

export function getPurchaseOrderMockEntity(id: number): PurchaseOrderDetail | null {
  return readDb().entities[String(id)] ?? null;
}

export function listPurchaseOrderMockEntities(): PurchaseOrderDetail[] {
  return Object.values(readDb().entities).sort((a, b) => b.id - a.id);
}

export function deletePurchaseOrderMockEntity(id: number): boolean {
  const db = readDb();
  if (!db.entities[String(id)]) return false;
  delete db.entities[String(id)];
  writeDb(db);
  return true;
}

export function isPurchaseOrderMockSeeded(): boolean {
  return readDb().seeded;
}

export function markPurchaseOrderMockSeeded() {
  const db = readDb();
  db.seeded = true;
  writeDb(db);
}
