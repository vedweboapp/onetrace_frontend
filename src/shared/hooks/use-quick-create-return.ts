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
};

/** Applies `?select=` and `?selectTarget=` after returning from a quick-create form page. */
export function useQuickCreateReturn({
  onApplySelect,
  onReloadOptions,
  restoreFormDraft,
  persistFormDraft,
}: UseQuickCreateReturnArgs) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const returnToForDraft = React.useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(QUICK_CREATE_SELECT_PARAM);
    params.delete(QUICK_CREATE_SELECT_TARGET_PARAM);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  React.useLayoutEffect(() => {
    if (!restoreFormDraft) return;
    const draft = loadQuickCreateFormDraft(returnToForDraft);
    if (draft == null) return;
    restoreFormDraft(draft);
    // Do not clear here — Strict Mode remounts must be able to restore again, and
    // selection apply must finish before we drop the snapshot.
  }, [restoreFormDraft, returnToForDraft]);

  React.useEffect(() => {
    const selectId = searchParams.get(QUICK_CREATE_SELECT_PARAM);
    const selectTargetRaw = searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM);
    if (!selectId || !/^\d+$/.test(selectId) || !isQuickCreateKind(selectTargetRaw)) return;

    let cancelled = false;
    void (async () => {
      try {
        await onReloadOptions?.();
        if (cancelled) return;
        await Promise.resolve(onApplySelect({ selectTarget: selectTargetRaw, selectId }));
        if (cancelled) return;
        persistFormDraft?.();
        clearQuickCreateFormDraft(returnToForDraft);
        clearQuickCreateFieldTarget(returnToForDraft);

        const params = new URLSearchParams(searchParams.toString());
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
  }, [
    searchParams,
    pathname,
    router,
    onApplySelect,
    onReloadOptions,
    persistFormDraft,
    returnToForDraft,
  ]);
}
