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
import { loadQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";

export type QuickCreateSelectApplied = {
  selectTarget: QuickCreateKind;
  selectId: string;
};


type UseQuickCreateReturnArgs = {
  onApplySelect: (args: QuickCreateSelectApplied) => void;
  onReloadOptions?: () => void | Promise<void>;
  /** Restores form values saved before navigating to quick create. */
  restoreFormDraft?: (draft: unknown) => void;
};

/** Applies `?select=` and `?selectTarget=` after returning from a quick-create form page. */
export function useQuickCreateReturn({
  onApplySelect,
  onReloadOptions,
  restoreFormDraft,
}: UseQuickCreateReturnArgs) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appliedRef = React.useRef(false);

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
    if (draft != null) {
      restoreFormDraft(draft);
    }
  }, [restoreFormDraft, returnToForDraft]);

  React.useEffect(() => {
    if (appliedRef.current) return;
    const selectId = searchParams.get(QUICK_CREATE_SELECT_PARAM);
    const selectTargetRaw = searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM);
    if (!selectId || !/^\d+$/.test(selectId) || !isQuickCreateKind(selectTargetRaw)) return;

    appliedRef.current = true;
    void (async () => {
      await onReloadOptions?.();
      onApplySelect({ selectTarget: selectTargetRaw, selectId });

      const params = new URLSearchParams(searchParams.toString());
      params.delete(QUICK_CREATE_SELECT_PARAM);
      params.delete(QUICK_CREATE_SELECT_TARGET_PARAM);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    })();
  }, [
    searchParams,
    pathname,
    router,
    onApplySelect,
    onReloadOptions,
    returnToForDraft,
  ]);
}
