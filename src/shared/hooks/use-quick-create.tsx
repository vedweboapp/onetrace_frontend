"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { QuickCreateKind } from "@/shared/types/quick-create.types";
import { buildQuickCreateNavigateHref } from "@/shared/utils/quick-create-navigation.util";
import { saveQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";

export type UseQuickCreateArgs = {
  kind: QuickCreateKind;
  /** Required for contact, site, and project quick create. */
  clientId?: number;
  /** When true, the + control is hidden. */
  addDisabled?: boolean;
  /** Override return URL (defaults to current page with query string). */
  returnTo?: string;
  /** Snapshot current form values before navigating away (restored on return). */
  getFormDraft?: () => unknown;
};

export function useQuickCreate({
  kind,
  clientId,
  addDisabled = false,
  returnTo: returnToProp,
  getFormDraft,
}: UseQuickCreateArgs) {
  const t = useTranslations("Dashboard.quickCreate");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const needsClient = kind === "contact" || kind === "site" || kind === "project";
  const hasClient = !needsClient || (clientId != null && clientId > 0);
  const canAdd = !addDisabled && hasClient;

  const addAriaLabel = t(`add.${kind}`);
  const addLabel = addAriaLabel;

  const returnTo = React.useMemo(() => {
    if (returnToProp) return returnToProp;
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [returnToProp, pathname, searchParams]);

  const navigateToCreate = React.useCallback(() => {
    if (!canAdd) return;
    if (getFormDraft) {
      saveQuickCreateFormDraft(returnTo, getFormDraft());
    }
    const href = buildQuickCreateNavigateHref(kind, {
      returnTo,
      clientId: clientId && clientId > 0 ? clientId : undefined,
    });
    router.push(href);
  }, [canAdd, kind, returnTo, clientId, router, getFormDraft]);

  return {
    canAdd,
    onAdd: canAdd ? navigateToCreate : undefined,
    addAriaLabel,
    addLabel,
  };
}
