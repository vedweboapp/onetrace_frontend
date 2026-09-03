"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { ContactType } from "@/features/contacts/types/contact.types";
import type { QuickCreateKind } from "@/shared/types/quick-create.types";
import { buildQuickCreateNavigateHref } from "@/shared/utils/quick-create-navigation.util";
import { saveQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";
import { buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";

export type UseQuickCreateArgs = {
  kind: QuickCreateKind;
  /** Required for client-scoped contact / site / project quick create. */
  clientId?: number;
  /** Required for vendor-scoped contact quick create. */
  vendorId?: number;
  contactType?: ContactType;
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
  vendorId,
  contactType,
  addDisabled = false,
  returnTo: returnToProp,
  getFormDraft,
}: UseQuickCreateArgs) {
  const t = useTranslations("Dashboard.quickCreate");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const needsClient = kind === "site" || (kind === "contact" && contactType !== "vendor");
  const needsVendor = kind === "contact" && contactType === "vendor";
  const hasClient = !needsClient || (clientId != null && clientId > 0);
  const hasVendor = !needsVendor || (vendorId != null && vendorId > 0);
  const canAdd = !addDisabled && hasClient && hasVendor;

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
      vendorId: vendorId && vendorId > 0 ? vendorId : undefined,
      contactType,
    });
    router.push(href);
  }, [canAdd, kind, returnTo, clientId, vendorId, contactType, router, getFormDraft]);

  return {
    canAdd,
    onAdd: canAdd ? navigateToCreate : undefined,
    addAriaLabel,
    addLabel,
  };
}

/** + Add that opens a settings page or an inline create modal. */
export function useSettingsQuickAdd(args: {
  href?: string;
  /** When set, opens inline create modal instead of navigating away. */
  onOpen?: () => void;
  addLabel: string;
  addDisabled?: boolean;
  getFormDraft?: () => unknown;
  returnTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { href, onOpen, addLabel, addDisabled = false, getFormDraft, returnTo: returnToProp } = args;

  const returnTo = React.useMemo(() => {
    if (returnToProp) return returnToProp;
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [returnToProp, pathname, searchParams]);

  const canAdd = !addDisabled && (typeof onOpen === "function" || Boolean(href?.trim()));

  const navigate = React.useCallback(() => {
    if (!canAdd) return;
    if (getFormDraft) {
      saveQuickCreateFormDraft(returnTo, getFormDraft());
    }
    if (onOpen) {
      onOpen();
      return;
    }
    if (href?.trim()) {
      router.push(buildPathWithStoredBack(href, returnTo));
    }
  }, [canAdd, getFormDraft, returnTo, onOpen, router, href]);

  return {
    canAdd,
    onAdd: canAdd ? navigate : undefined,
    addAriaLabel: addLabel,
    addLabel,
  };
}
