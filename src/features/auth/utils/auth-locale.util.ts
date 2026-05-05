import { cookies } from "next/headers";
import { routing, type AppLocale } from "@/i18n/routing";

const LOCALE_COOKIE = "NEXT_LOCALE";

export async function resolveAuthLocaleFromCookie(): Promise<AppLocale> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookieLocale && (routing.locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as AppLocale;
  }
  return routing.defaultLocale;
}
