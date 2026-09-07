/** Org slug from QR `public_url` (e.g. `org1` in `/org1/{uuid}`). */
const PUBLIC_QR_ORG_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

/** First URL segments that belong to the app, never a QR org slug. */
const RESERVED_PUBLIC_QR_ORG_IDS = new Set([
  "api",
  "clients",
  "composite-items",
  "contacts",
  "dispatches",
  "documentation",
  "forgot-password",
  "groups",
  "home",
  "invoices",
  "items",
  "jobs",
  "login",
  "material-requests",
  "projects",
  "public",
  "purchase-orders",
  "qr-codes",
  "quotations",
  "reset-password",
  "return-to-stock",
  "scheduling",
  "settings",
  "sign-up",
  "sites",
  "vendors",
]);


const PUBLIC_QR_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPublicQrOrgId(value: string): boolean {
  const orgId = value.trim();
  if (RESERVED_PUBLIC_QR_ORG_IDS.has(orgId.toLowerCase())) return false;
  return PUBLIC_QR_ORG_ID_RE.test(orgId);
}

export function isPublicQrUuid(value: string): boolean {
  return PUBLIC_QR_UUID_RE.test(value.trim());
}

export function isPublicQrCodeRoute(orgId: string, qrUuid: string): boolean {
  return isPublicQrOrgId(orgId) && isPublicQrUuid(qrUuid);
}


export function publicQrCodePath(orgId: string, qrUuid: string): string {
  return `/${orgId.trim()}/${qrUuid.trim()}`;
}
