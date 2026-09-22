"use client";

import { useTranslations } from "next-intl";
import { AppButton, AppModal } from "@/shared/ui";

export type SameGroupPeerRow = {
  id: number;
  name: string;
  title?: string;
};

type Props = {
  open: boolean;
  groupName: string;
  peers: SameGroupPeerRow[];
  busy?: boolean;
  onConfirm: () => void;
  onSkip: () => void;
};

export function ScheduleSameGroupOfferModal({
  open,
  groupName,
  peers,
  busy = false,
  onConfirm,
  onSkip,
}: Props) {
  const t = useTranslations("Dashboard.scheduling.bulk");

  return (
    <AppModal
      open={open}
      onClose={() => (!busy ? onSkip() : undefined)}
      title={t("sameGroupOfferTitle")}
      size="md"
      isBusy={busy}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <AppButton type="button" variant="secondary" size="sm" disabled={busy} onClick={onSkip}>
            {t("sameGroupOfferSkip")}
          </AppButton>
          <AppButton type="button" size="sm" loading={busy} disabled={busy} onClick={onConfirm}>
            {t("sameGroupOfferConfirm", { count: peers.length })}
          </AppButton>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-700 dark:text-slate-200">
          {t("sameGroupOfferBody", { group: groupName, count: peers.length })}
        </p>
        <ul className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/60">
          {peers.map((peer) => (
            <li
              key={peer.id}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <span className="font-semibold text-slate-900 dark:text-slate-50">{peer.name}</span>
              {peer.title ? (
                <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">· {peer.title}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </AppModal>
  );
}
