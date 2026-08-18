import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { isPublicQrCodeRoute } from "@/features/public/qr-code/utils/public-qr-code-route.util";
import { routing } from "@/i18n/routing";

const handleIntl = createMiddleware(routing);

/**
 * Scan URLs stay `/{orgId}/{uuid}`. Internally they live under `/public/qr/...`
 * so they cannot steal dashboard paths like `/settings/users/33`.
 */
function withPublicQrInternalPath(request: NextRequest): NextRequest {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  let nextPath: string | null = null;

  if (parts.length === 2 && isPublicQrCodeRoute(parts[0], parts[1])) {
    nextPath = `/public/qr/${parts[0]}/${parts[1]}`;
  } else if (
    parts.length === 3 &&
    (routing.locales as readonly string[]).includes(parts[0]) &&
    isPublicQrCodeRoute(parts[1], parts[2])
  ) {
    nextPath = `/${parts[0]}/public/qr/${parts[1]}/${parts[2]}`;
  }

  if (!nextPath) return request;

  const url = request.nextUrl.clone();
  url.pathname = nextPath;
  return new NextRequest(url, request);
}

/** Next.js 16 proxy (replaces middleware) — rewrites localePrefix:"never" URLs to /[locale]/... */
export function proxy(request: NextRequest) {
  return handleIntl(withPublicQrInternalPath(request));
}

export const config = {
  matcher: [
    "/",
    "/(en|es)/:path*",
    "/((?!api|_next|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
