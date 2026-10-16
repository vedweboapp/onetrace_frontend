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
  const applyKey = hasSelect && selectId && selectTarget ? `${pathname}|${selectTarget}|${selectId}` : null;

  // Restore draft + apply selection in layout so the field is selected before paint.
  React.useLayoutEffect(() => {
    const restore = restoreFormDraftRef.current;
    if (restore) {
      const draft =
        loadQuickCreateFormDraft(returnToForDraft) ??
        (returnToForDraft !== returnToFromUrl ? loadQuickCreateFormDraft(returnToFromUrl) : null);
      if (draft != null) restore(draft);
    }
    if (hasSelect && selectId && selectTarget) {
      // Sync apply (setValue) must happen here — do not wait for async option reload.
      void Promise.resolve(onApplySelectRef.current({ selectTarget, selectId }));
    }
  }, [returnToForDraft, returnToFromUrl, hasSelect, selectId, selectTarget]);

  React.useEffect(() => {
    if (!hasSelect || !selectId || !selectTarget || !applyKey) return;

    let cancelled = false;

    void (async () => {
      try {
        // Apply again before reload (covers Strict Mode remount / late draft restore).
        await Promise.resolve(onApplySelectRef.current({ selectTarget, selectId }));
        await onReloadOptionsRef.current?.();
        // Re-apply after reload so option refreshes cannot leave the field empty.
        await Promise.resolve(onApplySelectRef.current({ selectTarget, selectId }));

        // Persist selection into the draft BEFORE stripping URL. Do not clear the draft
        // here — React Strict Mode remounts must be able to restore the selected value.
        persistFormDraftRef.current?.();
        clearQuickCreateFieldTarget(returnToForDraft);
        clearQuickCreateFieldTarget(returnToFromUrl);

        // Only skip URL cleanup when this effect instance was superseded.
        if (cancelled) return;
        const params = new URLSearchParams(searchParamsRef.current.toString());
        // Guard: URL may already have been cleaned by a parallel Strict Mode run.
        if (!params.get(QUICK_CREATE_SELECT_PARAM)) return;
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
  }, [hasSelect, selectId, selectTarget, applyKey, pathname, router, returnToForDraft, returnToFromUrl]);
}
