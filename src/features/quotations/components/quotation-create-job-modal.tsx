"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchChecklistTypesPage } from "@/features/checklist-types/api/checklist-type.api";
import { fetchFormsPage } from "@/features/forms/api/forms.api";
import { AppButton, AppModal, FieldErrorText, FieldGroup, MultiCheckSelect } from "@/shared/ui";

export type QuotationCreateJobSelection = {
  forms: number[];
  checklists: number[];
};

type Option = { value: string; label: string };

type Props = {
  open: boolean;
  quoteName: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (selection: QuotationCreateJobSelection) => void;
};

export function QuotationCreateJobModal({
  open,
  quoteName,
  saving,
  onClose,
  onConfirm,
}: Props) {
  const t = useTranslations("Dashboard.quotations");
  const tJobs = useTranslations("Dashboard.jobs");

  const [forms, setForms] = React.useState<string[]>([]);
  const [checklists, setChecklists] = React.useState<string[]>([]);
  const [checklistError, setChecklistError] = React.useState<string | null>(null);

  const [formOptions, setFormOptions] = React.useState<Option[]>([]);
  const [checklistOptions, setChecklistOptions] = React.useState<Option[]>([]);
  const [formsLoading, setFormsLoading] = React.useState(false);
  const [checklistsLoading, setChecklistsLoading] = React.useState(false);
  const [formSearch, setFormSearch] = React.useState("");
  const [checklistSearch, setChecklistSearch] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setForms([]);
    setChecklists([]);
    setChecklistError(null);
    setFormSearch("");
    setChecklistSearch("");
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        setFormsLoading(true);
        try {
          const { items } = await fetchFormsPage(
            1,
            20,
            { search: formSearch || undefined, dropdown: true, is_published: true },
            { silent: true },
          );
          if (cancelled) return;
          setFormOptions(
            items
              .filter((row) => row.is_published !== false)
              .map((row) => ({ value: String(row.id), label: row.name })),
          );
        } catch {
          if (!cancelled) setFormOptions([]);
        } finally {
          if (!cancelled) setFormsLoading(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, formSearch]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        setChecklistsLoading(true);
        try {
          const { items } = await fetchChecklistTypesPage(1, 20, {
            is_active: true,
            search: checklistSearch || undefined,
            dropdown: true,
          });
          if (cancelled) return;
          setChecklistOptions(
            items.map((row) => ({
              value: String(row.id),
              label: row.title ?? `Checklist #${row.id}`,
            })),
          );
        } catch {
          if (!cancelled) setChecklistOptions([]);
        } finally {
          if (!cancelled) setChecklistsLoading(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, checklistSearch]);

  function handleConfirm() {
    if (checklists.length === 0) {
      setChecklistError(tJobs("validation.requiredChecklist"));
      return;
    }
    setChecklistError(null);
    onConfirm({
      forms: forms.map(Number).filter((id) => Number.isFinite(id) && id > 0),
      checklists: checklists.map(Number).filter((id) => Number.isFinite(id) && id > 0),
    });
  }

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={t("detail.createJobModalTitle")}
      description={t("detail.createJobModalDescription", { title: quoteName })}
      size="md"
      isBusy={saving}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={saving}
            disabled={saving || checklistsLoading}
            onClick={handleConfirm}
          >
            {t("detail.createJob")}
          </AppButton>
        </>
      }
    >
      <div className="space-y-4">
        <FieldGroup label={tJobs("fields.forms")} htmlFor="service-quote-create-job-forms">
          <MultiCheckSelect
            id="service-quote-create-job-forms"
            options={formOptions}
            values={forms}
            onChange={setForms}
            onSearchChange={setFormSearch}
            placeholder={tJobs("fields.forms")}
            listLabel={tJobs("fields.forms")}
            disabled={saving || formsLoading}
            searchable
            portaled
          />
        </FieldGroup>

        <FieldGroup required label={tJobs("fields.checklists")} htmlFor="service-quote-create-job-checklists">
          <MultiCheckSelect
            id="service-quote-create-job-checklists"
            options={checklistOptions}
            values={checklists}
            onChange={(next) => {
              setChecklists(next);
              if (next.length > 0) setChecklistError(null);
            }}
            onSearchChange={setChecklistSearch}
            placeholder={tJobs("fields.selectCheckList")}
            listLabel={tJobs("fields.checklists")}
            disabled={saving || checklistsLoading}
            invalid={Boolean(checklistError)}
            searchable
            portaled
          />
          <FieldErrorText>{checklistError}</FieldErrorText>
        </FieldGroup>
      </div>
    </AppModal>
  );
}
