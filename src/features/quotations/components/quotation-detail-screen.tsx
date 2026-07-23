"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchQuotation, updateQuotation } from "@/features/quotations/api/quotation.api";
import { QuotationDetailBody } from "@/features/quotations/components/quotation-detail-body";
import { QuotationExportDropdown } from "@/features/quotations/components/quotation-export-dropdown";
import { QuotationUpdateStatusDialog } from "@/features/quotations/components/quotation-update-status-dialog";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import {
  getQuotationCustomerId,
  getQuotationProjectId,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import { fetchTagsPage } from "@/features/tags/api/tag.api";
import { resolveQuotationSiteDetails } from "@/features/quotations/utils/quotation-site-details.util";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { EntityDetailEditButton, EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { AppButton } from "@/shared/ui";

type Props = {
  quotationId: number;
};

export function QuotationDetailScreen({ quotationId }: Props) {
  const t = useTranslations("Dashboard.quotations");
  const dueFmt = useDashboardDateFormat({ dateOnly: true });

  const [clientNames, setClientNames] = React.useState<Record<number, string>>({});
  const [projectNames, setProjectNames] = React.useState<Record<number, string>>({});
  const [siteNames, setSiteNames] = React.useState<Record<number, string>>({});
  const [tagNames, setTagNames] = React.useState<Record<number, string>>({});
  const [siteDetails, setSiteDetails] = React.useState<Site[]>([]);
  const [siteDetailsLoading, setSiteDetailsLoading] = React.useState(false);
  const [detailForSite, setDetailForSite] = React.useState<QuotationDetail | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: clients } = await fetchClientsPage(1, 500);
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of clients) mapped[row.id] = row.name;
          setClientNames(mapped);
        }
      } catch {
        if (!cancelled) setClientNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: projects } = await fetchProjectsPage(1, 500, { is_active: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of projects) mapped[row.id] = row.name;
          setProjectNames(mapped);
        }
      } catch {
        if (!cancelled) setProjectNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: sites } = await fetchSitesPage(1, 500);
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of sites) mapped[row.id] = row.site_name;
          setSiteNames(mapped);
        }
      } catch {
        if (!cancelled) setSiteNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: tags } = await fetchTagsPage(1, 500, { is_active: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of tags) {
            const label = (row.name ?? row.tag_name ?? "").trim();
            if (label) mapped[row.id] = label;
          }
          setTagNames(mapped);
        }
      } catch {
        if (!cancelled) setTagNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!detailForSite) {
      setSiteDetails([]);
      setSiteDetailsLoading(false);
      return;
    }

    let cancelled = false;
    setSiteDetailsLoading(true);
    setSiteDetails([]);
    void (async () => {
      try {
        const rows = await resolveQuotationSiteDetails(detailForSite);
        if (!cancelled) setSiteDetails(rows);
      } catch {
        if (!cancelled) setSiteDetails([]);
      } finally {
        if (!cancelled) setSiteDetailsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailForSite]);

  return (
    <EntityDetailScreen
      entityId={quotationId}
      listSection="quotations"
      listRoute={routes.dashboard.quotations}
      loadError={t("detailLoadError")}
      fetch={fetchQuotation}
      getTitle={(detail) => detail.quote_name}
      onDetailChange={setDetailForSite}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      actions={({ detail, listBack, retry }) => (
        <QuotationDetailActions
          quotationId={quotationId}
          detail={detail}
          listBack={listBack}
          onStatusSaved={retry}
          t={t}
        />
      )}
    >
      {({ detail, dateFmt }) => {
        const customerIdForLookup = getQuotationCustomerId(detail.customer);
        const projectIdForLookup = getQuotationProjectId(detail.project);
        return (
          <QuotationDetailBody
            detail={detail}
            customerName={customerIdForLookup != null ? clientNames[customerIdForLookup] : undefined}
            projectName={projectIdForLookup != null ? projectNames[projectIdForLookup] : undefined}
            siteNames={siteNames}
            tagLookup={tagNames}
            siteDetails={siteDetails}
            siteDetailsLoading={siteDetailsLoading}
            dateFmt={dateFmt}
            dueFmt={dueFmt}
          />
        );
      }}
    </EntityDetailScreen>
  );
}

function QuotationDetailActions({
  quotationId,
  detail,
  listBack,
  onStatusSaved,
  t,
}: {
  quotationId: number;
  detail: QuotationDetail;
  listBack: string;
  onStatusSaved: () => void;
  t: ReturnType<typeof useTranslations<"Dashboard.quotations">>;
}) {
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);

  async function handleStatusUpdate(status: string) {
    setStatusSaving(true);
    try {
      await updateQuotation(detail.id, { status });
      toastSuccess(t("statusUpdatedToast"));
      setStatusOpen(false);
      onStatusSaved();
    } catch (error) {
      toastApiError(error, t("statusUpdateError"));
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AppButton type="button" variant="secondary" size="sm" onClick={() => setStatusOpen(true)}>
        {t("updateStatus.action")}
      </AppButton>
      <QuotationExportDropdown quotationId={quotationId} quoteName={detail.quote_name} />
      <EntityDetailEditButton
        label={t("edit")}
        listBack={listBack}
        fallbackRoute={routes.dashboard.quotations}
      />
      <QuotationUpdateStatusDialog
        open={statusOpen}
        currentStatus={detail.status}
        quoteName={detail.quote_name}
        saving={statusSaving}
        onClose={() => setStatusOpen(false)}
        onConfirm={(status) => void handleStatusUpdate(status)}
      />
    </div>
  );
}
