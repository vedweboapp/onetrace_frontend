"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { fetchQuotation, sendQuotation, updateQuotation } from "@/features/quotations/api/quotation.api";
import {
  parseQuoteCategoryParam,
  resolveQuotationQuoteCategory,
} from "@/features/quotations/constants/quotation-category";
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
import {
  fetchUsersForAppRoles,
  userProfilesToSelectOptions,
} from "@/features/users/utils/load-users-by-role.util";
import { EntityDetailEditButton, EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { AppButton } from "@/shared/ui";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
 
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
  const [contactOptions, setContactOptions] = React.useState<CheckmarkSelectOption[]>([]);
  const [salespersonOptions, setSalespersonOptions] = React.useState<CheckmarkSelectOption[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Keep header/sidebar quote category in sync when opening detail without `?quote_category=`. */
  React.useEffect(() => {
    if (!detailForSite) return;
    const resolved = resolveQuotationQuoteCategory(detailForSite);
    const current = parseQuoteCategoryParam(searchParams.get("quote_category"));
    if (current === resolved) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("quote_category", resolved);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [detailForSite, pathname, router, searchParams]);

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
        const byRole = await fetchUsersForAppRoles(["sales"]);
        if (!cancelled) {
          setSalespersonOptions(userProfilesToSelectOptions(byRole.sales ?? []));
        }
      } catch {
        if (!cancelled) setSalespersonOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const customerId = detailForSite ? getQuotationCustomerId(detailForSite.customer) : null;
    if (!customerId) {
      setContactOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchContactsPage(1, 500, { client: customerId, is_active: true });
        if (!cancelled) {
          setContactOptions(
            items.map((c) => ({
              value: String(c.id),
              label: c.name?.trim() || c.email?.trim() || `#${c.id}`,
            })),
          );
        }
      } catch {
        if (!cancelled) setContactOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailForSite]);

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
      {({ detail, dateFmt, retry }) => {
        const customerIdForLookup = getQuotationCustomerId(detail.customer);
        const projectIdForLookup = getQuotationProjectId(detail.project);
        const clientOptions = Object.entries(clientNames).map(([id, name]) => ({
          value: id,
          label: name,
        }));
        const projectOptions = Object.entries(projectNames).map(([id, name]) => ({
          value: id,
          label: name,
        }));
        const siteOptions = Object.entries(siteNames).map(([id, name]) => ({
          value: id,
          label: name,
        }));
        const tagOptions = Object.entries(tagNames).map(([id, name]) => ({
          value: id,
          label: name,
        }));
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
            onSaved={retry}
            clientOptions={clientOptions}
            projectOptions={projectOptions}
            siteOptions={siteOptions}
            tagOptions={tagOptions}
            contactOptions={contactOptions}
            salespersonOptions={salespersonOptions}
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
  const [sending, setSending] = React.useState(false);

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

  async function handleSendQuotation() {
    setSending(true);
    try {
      await sendQuotation(quotationId);
      toastSuccess("Quotation sent successfully");
    } catch (error) {
      toastApiError(error, "Failed to send quotation");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AppButton type="button" variant="secondary" size="sm" onClick={() => setStatusOpen(true)}>
        {t("updateStatus.action")}
      </AppButton>
      <AppButton
        type="button"
        variant="secondary"
        size="sm"
        loading={sending}
        disabled={sending}
        onClick={() => void handleSendQuotation()}
      >
        <Send className="mr-1.5 size-4" />
        Send Quotation
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
