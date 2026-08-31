"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { formatContactOptionLabel } from "@/features/contacts/utils/contact-name.util";
import { SITE_CONTACT_PERSON_TITLES } from "@/features/sites/constants/site-contact-person.constants";
import { fetchTitlesPage } from "@/features/titles/api/title.api";
import type { Title } from "@/features/titles/types/title.types";
import type { Site, SiteContactPersonPayload } from "@/features/sites/types/site.types";
import {
  formatSiteContactPersonContactLabel,
  getSiteContactPersonContactId,
  normalizeSiteContactPersonsFromApi,
} from "@/features/sites/utils/site-contact-person.util";
import { DetailEntityLink } from "@/shared/components/entity";
import { DetailPanelCard } from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { AppButton, CheckmarkSelect } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import type { ReactNode } from "react";

type DraftRow = {
  key: string;
  title: string;
  contact: string;
};

type Props = {
  title: ReactNode;
  detail: Site;
  contactNameById?: Record<number, string>;
  titleNameById?: Record<string, string>;
  onSaveContacts: (contacts: SiteContactPersonPayload[]) => Promise<void>;
};

function emptyDraftRow(): DraftRow {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    contact: "",
  };
}

/** Prefer title id (matches CheckmarkSelect options); fall back to name/string. */
function resolveDraftTitleValue(rawTitle: unknown): string {
  if (rawTitle && typeof rawTitle === "object") {
    const obj = rawTitle as Record<string, unknown>;
    if (obj.id != null && String(obj.id).trim()) return String(obj.id);
    const name = obj.title ?? obj.name;
    return name != null ? String(name) : "";
  }
  return rawTitle != null ? String(rawTitle) : "";
}

function rowsFromDetail(detail: Site): DraftRow[] {
  return normalizeSiteContactPersonsFromApi(detail).map((row, index) => {
    const contactId = getSiteContactPersonContactId(row.contact);
    const title = resolveDraftTitleValue(row.title);
    return {
      key: String(row.id ?? `${title}-${contactId ?? index}`),
      title,
      contact: contactId ? String(contactId) : "",
    };
  });
}

export function SiteDetailContactPersonsEditor({
  title,
  detail,
  contactNameById = {},
  titleNameById = {},
  onSaveContacts,
}: Props) {
  const t = useTranslations("Dashboard.sites");
  const tActions = useTranslations("Dashboard.common.actions");
  const clientId =
    typeof detail.client === "number"
      ? detail.client
      : typeof detail.client?.id === "number"
        ? detail.client.id
        : null;

  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draftRows, setDraftRows] = React.useState<DraftRow[]>([]);
  const [contactOptions, setContactOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [titles, setTitles] = React.useState<Title[]>([]);

  const displayRows = normalizeSiteContactPersonsFromApi(detail);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { items } = await fetchTitlesPage(1, 500);
        if (!cancelled) setTitles(items);
      } catch {
        if (!cancelled) setTitles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!clientId || clientId <= 0) {
        setContactOptions([]);
        return;
      }
      try {
        const { items } = await fetchContactsPage(1, 500, { client: clientId, is_active: true });
        if (!cancelled) {
          setContactOptions(
            items.map((c) => ({
              value: String(c.id),
              label: formatContactOptionLabel(c),
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
  }, [clientId]);

  function startEdit(options?: { withNewRow?: boolean }) {
    const existing = rowsFromDetail(detail);
    if (options?.withNewRow) {
      setDraftRows([...existing, emptyDraftRow()]);
    } else if (existing.length === 0) {
      // First add: show title/contact fields immediately (not another Add button only).
      setDraftRows([emptyDraftRow()]);
    } else {
      setDraftRows(existing);
    }
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraftRows([]);
  }

  function titleOptionsFor(selected: string) {
    const list = [
      { value: "", label: t("contactPerson.titlePlaceholder") },
      ...titles.map((item) => ({ value: String(item.id), label: item.title })),
    ];
    if (selected && !list.some((opt) => opt.value === selected)) {
      const isLegacy = (SITE_CONTACT_PERSON_TITLES as readonly string[]).includes(selected);
      list.push({
        value: selected,
        label: isLegacy
          ? t(`contactPerson.titles.${selected}`, { defaultValue: selected })
          : titleNameById[selected] || selected,
      });
    }
    return list;
  }

  const contactSelectOptions = React.useMemo(() => {
    const list = [
      { value: "", label: t("contactPerson.contactPlaceholder") },
      ...contactOptions,
    ];
    for (const row of draftRows) {
      if (row.contact && !list.some((opt) => opt.value === row.contact)) {
        list.push({
          value: row.contact,
          label: contactNameById[Number(row.contact)] || `#${row.contact}`,
        });
      }
    }
    return list;
  }, [contactOptions, draftRows, contactNameById, t]);

  async function save() {
    const payload: SiteContactPersonPayload[] = [];
    for (const row of draftRows) {
      const contactId = Number.parseInt(row.contact, 10);
      if (!row.title.trim() || !Number.isFinite(contactId) || contactId <= 0) continue;
      payload.push({ title: row.title.trim(), contact: contactId });
    }
    setSaving(true);
    try {
      await onSaveContacts(payload);
      setEditing(false);
      setDraftRows([]);
    } finally {
      setSaving(false);
    }
  }

  function resolveTitleLabel(rawTitle: unknown): string {
    const titleKey = resolveDraftTitleValue(rawTitle);
    const fromObjectName =
      rawTitle && typeof rawTitle === "object"
        ? String(
            (rawTitle as Record<string, unknown>).title ??
              (rawTitle as Record<string, unknown>).name ??
              "",
          )
        : "";
    const resolved =
      titleNameById[titleKey] ||
      fromObjectName ||
      titleKey;
    const isLegacy = ["site_contact", "finance", "emergency"].includes(resolved);
    if (isLegacy) {
      return t(`contactPerson.titles.${resolved}`, { defaultValue: resolved });
    }
    return resolved || "—";
  }

  const headerAddEdit = !editing ? (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="text-sm font-semibold text-[color:var(--dash-accent,#111111)] underline-offset-2 hover:underline"
        onClick={() => startEdit(displayRows.length > 0 ? { withNewRow: true } : undefined)}
      >
        {tActions("add")}
      </button>
      {displayRows.length > 0 ? (
        <button
          type="button"
          className="text-sm font-semibold text-slate-600 underline-offset-2 hover:underline dark:text-slate-300"
          onClick={() => startEdit()}
        >
          {tActions("edit")}
        </button>
      ) : null}
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={cancelEdit}>
        {tActions("cancel")}
      </AppButton>
      <AppButton
        type="button"
        size="sm"
        loading={saving}
        disabled={saving || !clientId}
        onClick={() => void save()}
      >
        {tActions("save")}
      </AppButton>
    </div>
  );

  if (!editing) {
    return (
      <DetailPanelCard title={title} headerRight={headerAddEdit}>
        {displayRows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("contactPerson.empty")}</p>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="text-xs font-semibold tracking-normal text-slate-400 dark:text-slate-500">
                {t("contactPerson.titleLabel")}
              </span>
              <span className="text-xs font-semibold tracking-normal text-slate-400 dark:text-slate-500">
                {t("contactPerson.contactLabel")}
              </span>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayRows.map((row, index) => {
                const contactId = getSiteContactPersonContactId(row.contact);
                const contactLabel = formatSiteContactPersonContactLabel(row.contact, contactNameById);
                return (
                  <li
                    key={row.id ?? `${String(row.title)}-${contactId ?? index}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 last:pb-0"
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {resolveTitleLabel(row.title)}
                    </span>
                    {contactId ? (
                      <DetailEntityLink
                        href={`${routes.dashboard.contacts}/${contactId}`}
                        className="text-sm font-semibold text-blue-600 underline-offset-2 hover:underline"
                      >
                        {contactLabel}
                      </DetailEntityLink>
                    ) : (
                      <span className="text-sm text-slate-600 dark:text-slate-400">{contactLabel}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </DetailPanelCard>
    );
  }

  return (
    <DetailPanelCard title={title} headerRight={headerAddEdit}>
      <div className="space-y-3">
        {!clientId ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">{t("validation.client")}</p>
        ) : null}
        <ul className="space-y-3">
          {draftRows.map((row, index) => (
            <li
              key={row.key}
              className="grid gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-[1fr_1fr_auto] dark:border-slate-800"
            >
              <CheckmarkSelect
                listLabel={t("contactPerson.titleLabel")}
                options={titleOptionsFor(row.title)}
                value={row.title}
                disabled={saving || !clientId}
                size="sm"
                portaled
                searchable
                className="w-full min-w-0"
                onChange={(v) => {
                  setDraftRows((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, title: v } : r)),
                  );
                }}
              />
              <CheckmarkSelect
                listLabel={t("contactPerson.contactLabel")}
                options={contactSelectOptions}
                value={row.contact}
                disabled={saving || !clientId}
                size="sm"
                portaled
                searchable
                className="w-full min-w-0"
                onChange={(v) => {
                  setDraftRows((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, contact: v } : r)),
                  );
                }}
              />
              <button
                type="button"
                disabled={saving}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-md text-slate-500",
                  "hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800",
                )}
                aria-label={tActions("delete")}
                onClick={() => setDraftRows((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={saving || !clientId}
          className="text-sm font-semibold text-[color:var(--dash-accent,#111111)] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setDraftRows((prev) => [...prev, emptyDraftRow()])}
        >
          {tActions("add")}
        </button>
      </div>
    </DetailPanelCard>
  );
}
