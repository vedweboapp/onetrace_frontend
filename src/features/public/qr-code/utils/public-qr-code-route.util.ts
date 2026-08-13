/** Org slug from QR `public_url` (e.g. `org1` in `/org1/{uuid}`). */
const PUBLIC_QR_ORG_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;


const PUBLIC_QR_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPublicQrOrgId(value: string): boolean {
  return PUBLIC_QR_ORG_ID_RE.test(value.trim());
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
