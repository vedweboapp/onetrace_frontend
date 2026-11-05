"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppButton, type AppButtonProps } from "@/shared/ui/app-button";
import type { MassActionResourceKey } from "@/shared/mass-actions/mass-action-config";
import { buildModuleImportConfig } from "./import-module-catalog";
import { ImportWizard } from "./import-wizard";
import type { ModuleImportConfig, ModuleImportResult } from "./types";

type ImportButtonProps = Omit<AppButtonProps, "variant" | "size" | "children"> & {
  children?: React.ReactNode;
};

export function ImportButton({ children, ...props }: ImportButtonProps) {
  const t = useTranslations("Dashboard.common.actions");
  return (
    <AppButton type="button" variant="secondary" size="sm" {...props}>
      <Upload className="size-3.5" aria-hidden />
      {children ?? t("import")}
    </AppButton>
  );
}

type ModuleImportControlProps = {
  resource: MassActionResourceKey;
  moduleLabel: string;
  onSuccess?: (result: ModuleImportResult) => void;
  /** Optional custom config; when omitted, built from catalog + i18n field labels. */
  config?: ModuleImportConfig | null;
};

/**
 * Import button + multi-step wizard for a list page.
 * Place beside Add in `ListPageHeader` action slot.
 */
export function ModuleImportControl({
  resource,
  moduleLabel,
  onSuccess,
  config: configProp,
}: ModuleImportControlProps) {
  const tFields = useTranslations("Dashboard.import.fields");
  const [open, setOpen] = React.useState(false);

  const config = React.useMemo(() => {
    if (configProp) return configProp;
    return buildModuleImportConfig(resource, moduleLabel, (key) => {
      if (tFields.has(key as never)) return tFields(key as never);
      return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    });
  }, [configProp, resource, moduleLabel, tFields]);

  if (!config) return null;

  return (
    <>
      <ImportButton onClick={() => setOpen(true)} />
      <ImportWizard
        open={open}
        onClose={() => setOpen(false)}
        config={config}
        onSuccess={onSuccess}
      />
    </>
  );
}

/** Flex group for Import + Add (or any primary actions). */
export function ListPageActionGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}
