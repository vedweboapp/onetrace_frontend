import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReturnToStockCreateScreen } from "@/features/dispatches/components/return-to-stock-create-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.dispatches");
  return { title: t("return.newRequestTitle") };
}

type PageProps = {
  searchParams: Promise<{
    worker?: string;
    material_request_id?: string;
    back?: string;
  }>;
};

export default async function DashboardReturnToStockNewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const workerId = params.worker ? Number.parseInt(params.worker, 10) : null;
  const materialRequestId = params.material_request_id
    ? Number.parseInt(params.material_request_id, 10)
    : null;

  return (
    <ReturnToStockCreateScreen
      initialWorkerId={Number.isFinite(workerId ?? NaN) ? workerId : null}
      initialMaterialRequestId={Number.isFinite(materialRequestId ?? NaN) ? materialRequestId : null}
    />
  );
}
