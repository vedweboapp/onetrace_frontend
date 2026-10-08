"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import type { QuotationDraft, QuotationDraftSection } from "@/features/quotations/types/quotation-draft.types";
import { QuotationDraftSectionServices } from "@/features/quotations/components/quotation-draft-section-services";
import { QuotationDraftSectionMaterials } from "@/features/quotations/components/quotation-draft-section-materials";
import { QuotationDraftPriceTotalBar } from "@/features/quotations/components/quotation-draft-composite-lines";
import { draftSectionTotal } from "@/features/quotations/utils/quotation-draft-compute.util";
import { normalizeQuotationScopeBackHref } from "@/features/quotations/utils/quotation-block-scope.util";
import {
  readQuotationSectionScopeSession,
  writeQuotationSectionScopeSession,
} from "@/features/quotations/utils/quotation-section-scope.util";
import { EntityDetailLoadingSkeleton } from "@/shared/components/entity";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { DetailPagePadding, DetailPanelCard } from "@/shared/components/layout/detail-metric-card";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";
import { AppButton, AppTabs, SurfaceShell, surfaceTextareaClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  defaultBackHref: string;
};

type LeaveIntent = "idle" | "done" | "quickcreate";

export function QuotationSectionScopeDetailScreen({ defaultBackHref }: Props) {
  const t = useTranslations("Dashboard.quotations.draft");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const router = useRouter();
  const searchParams = useSearchParams();

  const sectionIdFromUrl = searchParams.get("section")?.trim() ?? "";
  const backHref = React.useMemo(
    () =>
      normalizeQuotationScopeBackHref(
        searchParams.get("back") ?? readQuotationSectionScopeSession()?.backHref,
        mergeUrlQueryParam(defaultBackHref, "tab", "pricing"),
      ),
    [searchParams, defaultBackHref],
  );

  const [ready, setReady] = React.useState(false);
  const [draft, setDraft] = React.useState<QuotationDraft | null>(null);
  const [sectionId, setSectionId] = React.useState("");
  const [readOnly, setReadOnly] = React.useState(false);
  const [innerTab, setInnerTab] = React.useState<"service" | "materials">("service");

  const draftRef = React.useRef(draft);
  draftRef.current = draft;
  const sectionIdRef = React.useRef(sectionId);
  sectionIdRef.current = sectionId;
  const readOnlyRef = React.useRef(readOnly);
  readOnlyRef.current = readOnly;
  const backHrefRef = React.useRef(backHref);
  backHrefRef.current = backHref;
  const leaveIntentRef = React.useRef<LeaveIntent>("idle");

  const persistSession = React.useCallback(
    (nextDraft: QuotationDraft, pendingApply: boolean, entryDraft?: QuotationDraft) => {
      const session = readQuotationSectionScopeSession();
      writeQuotationSectionScopeSession({
        draft: nextDraft,
        entryDraft: entryDraft ?? session?.entryDraft ?? nextDraft,
        sectionId: sectionIdRef.current,
        backHref: session?.backHref ?? backHrefRef.current,
        readOnly: session?.readOnly ?? readOnlyRef.current,
        pendingApply: pendingApply && !(session?.readOnly ?? readOnlyRef.current),
      });
    },
    [],
  );

  React.useEffect(() => {
    const session = readQuotationSectionScopeSession();
    if (session) {
      setDraft(session.draft);
      setSectionId(sectionIdFromUrl || session.sectionId);
      setReadOnly(session.readOnly);
    }
    setReady(true);
  }, [sectionIdFromUrl]);

  // Discard working edits unless Done (or keep them while quick-creating an item).
  React.useEffect(() => {
    return () => {
      if (readOnlyRef.current) return;
      const latest = draftRef.current;
      if (!latest) return;
      const intent = leaveIntentRef.current;
      if (intent === "done") return;
      if (intent === "quickcreate") {
        persistSession(latest, false);
        return;
      }
      const session = readQuotationSectionScopeSession();
      const entry = session?.entryDraft ?? latest;
      persistSession(entry, false, entry);
    };
  }, [persistSession]);

  const section = React.useMemo(
    () => draft?.sections.find((s) => s.id === sectionId) ?? null,
    [draft, sectionId],
  );

  const patchSection = React.useCallback(
    (patch: Partial<QuotationDraftSection>) => {
      if (readOnlyRef.current) return;
      const current = draftRef.current;
      if (!current) return;
      const sid = sectionIdRef.current;
      const next: QuotationDraft = {
        sections: current.sections.map((s) => (s.id === sid ? { ...s, ...patch } : s)),
      };
      draftRef.current = next;
      setDraft(next);
      // Working session only — parent applies after Done.
      persistSession(next, false);
    },
    [persistSession],
  );

  function onDone() {
    leaveIntentRef.current = "done";
    const latest = draftRef.current;
    if (!latest) {
      router.push(backHref);
      return;
    }
    persistSession(latest, true);
    router.push(backHref);
  }

  const restoreFormDraft = React.useCallback(
    (saved: unknown) => {
      const s = saved as { draft?: QuotationDraft; sectionId?: string };
      if (s?.draft && Array.isArray(s.draft.sections)) {
        draftRef.current = s.draft;
        setDraft(s.draft);
        persistSession(s.draft, false);
      }
      if (typeof s?.sectionId === "string" && s.sectionId.trim()) {
        setSectionId(s.sectionId);
        sectionIdRef.current = s.sectionId;
      }
    },
    [persistSession],
  );

  const getFormDraft = React.useCallback(() => {
    leaveIntentRef.current = "quickcreate";
    const latest = draftRef.current;
    if (latest) persistSession(latest, false);
    return {
      draft: latest,
      sectionId: sectionIdRef.current,
    };
  }, [persistSession]);

  if (!ready) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <DetailPageHeader title={t("sectionScopeLoading")} titleLoading backHref={backHref} backAriaLabel={t("sectionScopeBackAria")} />
        <DetailPagePadding>
          <SurfaceShell>
            <EntityDetailLoadingSkeleton />
          </SurfaceShell>
        </DetailPagePadding>
      </div>
    );
  }

  if (!draft || !section) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <DetailPageHeader title={t("sectionScopeMissingTitle")} backHref={backHref} backAriaLabel={t("sectionScopeBackAria")} />
        <DetailPagePadding>
          <SurfaceShell className="p-6 text-sm text-slate-500 dark:text-slate-400">{t("sectionScopeMissingBody")}</SurfaceShell>
        </DetailPagePadding>
      </div>
    );
  }

  const sectionTotal = draftSectionTotal(section);

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-12">
      <DetailPageHeader
        title={section.name?.trim() || t("newSectionPlaceholder")}
        backHref={backHref}
        backAriaLabel={t("sectionScopeBackAria")}
        subtitle={t("sectionScopeSubtitle")}
        actions={
          <AppButton type="button" variant="primary" size="sm" onClick={onDone}>
            {readOnly ? t("sectionScopeBack") : t("sectionScopeDone")}
          </AppButton>
        }
      />

      <DetailPagePadding className="flex-1">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("sectionDescription")}
              </label>
              <textarea
                value={section.description ?? ""}
                disabled={readOnly}
                rows={8}
                className={cn(surfaceTextareaClassName, "min-h-[12rem] w-full")}
                onChange={(e) => patchSection({ description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("sectionNotes")}
              </label>
              <textarea
                value={section.notes ?? ""}
                disabled={readOnly}
                rows={8}
                className={cn(surfaceTextareaClassName, "min-h-[12rem] w-full")}
                onChange={(e) => patchSection({ notes: e.target.value })}
              />
            </div>
          </div>

          <DetailPanelCard title={t("sectionLabourMaterials")}>
            <AppTabs
              tabs={[
                { id: "service", label: t("sectionServiceTab") },
                { id: "materials", label: t("sectionMaterialsTab") },
              ]}
              value={innerTab}
              onValueChange={(id) => setInnerTab(id === "materials" ? "materials" : "service")}
              ariaLabel={t("sectionInnerTabsAria")}
              panelIdPrefix="quotation-section-scope"
            />
            <div className="mt-4 space-y-3">
              {/* Keep both panels mounted so Service ↔ Items switches do not drop lines. */}
              <div className={innerTab === "service" ? "space-y-3" : "hidden"} hidden={innerTab !== "service"}>
                <QuotationDraftSectionServices
                  services={section.services ?? []}
                  readOnly={readOnly}
                  onChange={(services) => patchSection({ services })}
                  getFormDraft={readOnly ? undefined : getFormDraft}
                  restoreFormDraft={readOnly ? undefined : restoreFormDraft}
                />
              </div>
              <div
                className={innerTab === "materials" ? "space-y-3" : "hidden"}
                hidden={innerTab !== "materials"}
              >
                <QuotationDraftSectionMaterials
                  pins={section.section_pins ?? []}
                  readOnly={readOnly}
                  onChange={(section_pins) => patchSection({ section_pins })}
                />
              </div>
              <QuotationDraftPriceTotalBar
                label={t("sectionTotal")}
                amount={sectionTotal}
                locale={loc}
                showMenuSpacer={innerTab === "materials" && !readOnly}
                className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </DetailPanelCard>
        </div>
      </DetailPagePadding>
    </div>
  );
}
