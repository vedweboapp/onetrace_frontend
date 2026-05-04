import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

const handleIntl = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return handleIntl(request);
}

export const config = {
  matcher: [
    "/",
    "/(en|es)/:path*",
    "/((?!api|_next|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
