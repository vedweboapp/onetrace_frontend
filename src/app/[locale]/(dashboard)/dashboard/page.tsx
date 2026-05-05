import { redirect } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";

type Props = {
  params: Promise<{ locale: string }>;
};


export default async function DashboardIndexPage({ params }: Props) {
  const { locale } = await params;
  redirect({ href: routes.dashboard.projects, locale });
}
