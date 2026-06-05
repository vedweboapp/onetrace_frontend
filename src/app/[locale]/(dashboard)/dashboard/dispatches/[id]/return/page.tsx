import { redirect } from "next/navigation";
import { routes } from "@/shared/config/routes";

type PageProps = {
  params: Promise<{ locale: string }>;
};

/** Legacy URL → standalone return-to-stock feature. */
export default async function DashboardDispatchReturnRedirectPage({ params }: PageProps) {
  const { locale } = await params;
  redirect(`/${locale}${routes.dashboard.returnToStock}`);
}
