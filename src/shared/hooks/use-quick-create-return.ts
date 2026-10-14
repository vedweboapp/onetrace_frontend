"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { QuickCreateKind } from "@/shared/types/quick-create.types";
import { isQuickCreateKind } from "@/shared/types/quick-create.types";
import {
  QUICK_CREATE_SELECT_PARAM,
  QUICK_CREATE_SELECT_TARGET_PARAM,
} from "@/shared/utils/quick-create-navigation.util";
import {
  clearQuickCreateFieldTarget,
  clearQuickCreateFormDraft,
  loadQuickCreateFormDraft,
} from "@/shared/utils/quick-create-form-draft.util";

export type QuickCreateSelectApplied = {
  selectTarget: QuickCreateKind;
  selectId: string;
};

type UseQuickCreateReturnArgs = {
  onApplySelect: (args: QuickCreateSelectApplied) => void | Promise<void>;
  onReloadOptions?: () => void | Promise<void>;
  /** Restores form values saved before navigating to quick create. */
  restoreFormDraft?: (draft: unknown) => void;
  /** Persist form (incl. applied select) before clearing the QC draft / stripping URL. */
  persistFormDraft?: () => void;
  /**
   * Stable draft key used when navigating away (must match `useQuickCreate` `returnTo`).
   * Prefer this over deriving from the URL so injected query params stay aligned.
   */
  draftReturnTo?: string;
};

/** Applies `?select=` and `?selectTarget=` after returning from a quick-create form page. */
export function useQuickCreateReturn({
  onApplySelect,
  onReloadOptions,
  restoreFormDraft,
  persistFormDraft,
  draftReturnTo: draftReturnToProp,
}: UseQuickCreateReturnArgs) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const returnToFromUrl = React.useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(QUICK_CREATE_SELECT_PARAM);
    params.delete(QUICK_CREATE_SELECT_TARGET_PARAM);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const returnToForDraft = draftReturnToProp?.trim() || returnToFromUrl;

  const onApplySelectRef = React.useRef(onApplySelect);
  const onReloadOptionsRef = React.useRef(onReloadOptions);
  const restoreFormDraftRef = React.useRef(restoreFormDraft);
  const persistFormDraftRef = React.useRef(persistFormDraft);
  const searchParamsRef = React.useRef(searchParams);
  onApplySelectRef.current = onApplySelect;
  onReloadOptionsRef.current = onReloadOptions;
  restoreFormDraftRef.current = restoreFormDraft;
  persistFormDraftRef.current = persistFormDraft;
  searchParamsRef.current = searchParams;

  const selectId = searchParams.get(QUICK_CREATE_SELECT_PARAM);
  const selectTargetRaw = searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM);
  const selectTarget = isQuickCreateKind(selectTargetRaw) ? selectTargetRaw : null;
  const hasSelect = Boolean(selectId && /^\d+$/.test(selectId) && selectTarget);

  React.useLayoutEffect(() => {
    const restore = restoreFormDraftRef.current;
    if (!restore) return;
    const draft =
      loadQuickCreateFormDraft(returnToForDraft) ??
      (returnToForDraft !== returnToFromUrl ? loadQuickCreateFormDraft(returnToFromUrl) : null);
    if (draft == null) return;
    restore(draft);
  }, [returnToForDraft, returnToFromUrl, hasSelect, selectId, selectTarget]);

  React.useEffect(() => {
    if (!hasSelect || !selectId || !selectTarget) return;

    let cancelled = false;

    void (async () => {
      try {
        await onReloadOptionsRef.current?.();
        if (cancelled) return;
        await Promise.resolve(onApplySelectRef.current({ selectTarget, selectId }));
        if (cancelled) return;
        persistFormDraftRef.current?.();
        clearQuickCreateFormDraft(returnToForDraft);
        if (returnToForDraft !== returnToFromUrl) {
          clearQuickCreateFormDraft(returnToFromUrl);
        }
        clearQuickCreateFieldTarget(returnToForDraft);
        clearQuickCreateFieldTarget(returnToFromUrl);

        if (cancelled) return;
        const params = new URLSearchParams(searchParamsRef.current.toString());
        params.delete(QUICK_CREATE_SELECT_PARAM);
        params.delete(QUICK_CREATE_SELECT_TARGET_PARAM);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      } catch {
        // Leave select params / draft so a refresh can retry.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasSelect, selectId, selectTarget, pathname, router, returnToForDraft, returnToFromUrl]);
}
