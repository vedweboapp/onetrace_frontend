import api from "@/core/api/axios";
import type { PublicQrLookupResult } from "@/features/public/qr-code/types/public-qr.types";
import { parsePublicQrResponse } from "@/features/public/qr-code/utils/public-qr-response.util";

/** GET `public/qr/{uuid}/` — returns assigned job when the QR has data. */
export async function fetchPublicQrByUuid(qrUuid: string): Promise<PublicQrLookupResult> {
  const uuid = qrUuid.trim();
  const { data } = await api.get<unknown>(`public/qr/${uuid}/`, {
    skipErrorToast: true,
  });
  return parsePublicQrResponse(data);
}
