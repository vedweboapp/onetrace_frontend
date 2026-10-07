"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import type { QuotationDraft, QuotationDraftSection } from "@/features/quotations/types/quotation-draft.types";
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
import { AppButton, SurfaceShell, surfaceTextareaClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  defaultBackHref: string;
};

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

  const draftRef = React.useRef(draft);
  draftRef.current = draft;
  const sectionIdRef = React.useRef(sectionId);
  sectionIdRef.current = sectionId;
  const readOnlyRef = React.useRef(readOnly);
  readOnlyRef.current = readOnly;
  const backHrefRef = React.useRef(backHref);
  backHrefRef.current = backHref;

  const persistSession = React.useCallback((nextDraft: QuotationDraft, pendingApply: boolean) => {
    const session = readQuotationSectionScopeSession();
    writeQuotationSectionScopeSession({
      draft: nextDraft,
      sectionId: sectionIdRef.current,
      backHref: session?.backHref ?? backHrefRef.current,
      readOnly: session?.readOnly ?? readOnlyRef.current,
      pendingApply: pendingApply && !(session?.readOnly ?? readOnlyRef.current),
    });
  }, []);

  React.useEffect(() => {
    const session = readQuotationSectionScopeSession();
    if (session) {
      setDraft(session.draft);
      setSectionId(sectionIdFromUrl || session.sectionId);
      setReadOnly(session.readOnly);
    }
    setReady(true);
  }, [sectionIdFromUrl]);

  // Keep parent draft in session while editing so back/Done both restore sections + fields.
  React.useEffect(() => {
    return () => {
      const latest = draftRef.current;
      if (!latest || readOnlyRef.current) return;
      persistSession(latest, true);
    };
  }, [persistSession]);

  const section = React.useMemo(
    () => draft?.sections.find((s) => s.id === sectionId) ?? null,
    [draft, sectionId],
  );

  function patchSection(patch: Partial<QuotationDraftSection>) {
    if (!draft || readOnly) return;
    const next: QuotationDraft = {
      sections: draft.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    };
    setDraft(next);
    persistSession(next, true);
  }

  function persistAndBack(nextDraft: QuotationDraft) {
    persistSession(nextDraft, true);
    router.push(backHref);
  }

  function onDone() {
    if (!draft) {
      router.push(backHref);
      return;
    }
    persistAndBack(draft);
  }

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
            <div className="space-y-3">
              <QuotationDraftSectionMaterials
                pins={section.section_pins ?? []}
                readOnly={readOnly}
                onChange={(section_pins) => patchSection({ section_pins })}
              />
              <QuotationDraftPriceTotalBar
                label={t("sectionTotal")}
                amount={sectionTotal}
                locale={loc}
                showMenuSpacer={!readOnly}
                className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </DetailPanelCard>
        </div>
      </DetailPagePadding>
    </div>
  );
}
