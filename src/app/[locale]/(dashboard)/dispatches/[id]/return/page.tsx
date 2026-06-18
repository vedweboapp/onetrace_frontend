import { redirect } from "next/navigation";
import { routes } from "@/shared/config/routes";

/** Legacy URL → standalone return-to-stock feature. */
export default function DashboardDispatchReturnRedirectPage() {
  redirect(routes.dashboard.returnToStock);
}
