import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Project Statuses" };
}

export default async function DashboardPinStatusSettingsRedirectPage() {
  const locale = await getLocale();
  redirect({ href: routes.dashboard.settingsProjectStatus, locale });
}
