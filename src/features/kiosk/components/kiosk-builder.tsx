"use client";

import React, { useState, useCallback } from "react";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { AppButton as Button } from "@/shared/ui/app-button";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { DataTableRowActionsMenu } from "@/shared/ui/data-table-row-actions-menu";
import {
  Monitor,
  Smartphone,
  Plus,
  Trash2,
  Copy,
  Edit2,
  CheckCircle2,
  ArrowLeft,
  Settings2,
  CreditCard,
  Layers,
} from "lucide-react";
import type {
  KioskConfig,
  KioskField,
  KioskSection,
} from "../types/kiosk.types";
import { DEFAULT_KIOSK_CONFIG } from "../types/kiosk.types";
import { KioskModuleBar, KIOSK_FIELDS_PALETTE, KioskFieldPaletteItem } from "./kiosk-module-bar";
import { DynamicKioskFieldPreview } from "./dynamic-kiosk-field-preview";
import { KioskFieldConfigModal } from "./kiosk-field-config-modal";
import { KioskRenderer } from "./kiosk-renderer";

interface KioskBuilderProps {
  initialConfig?: KioskConfig;
  onSave?: (config: KioskConfig) => void;
  backUrl?: string;
}

const generateUid = (prefix = "k_") => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

// Section Dropzone for palette fields and section reordering
const SectionDropZone: React.FC<{
  section: KioskSection;
  index: number;
  onAddField: (sectionUid: string, fieldType: string, inputType?: string, label?: string, color?: string) => void;
  onEditField: (field: KioskField, sectionUid: string) => void;
  onDeleteField: (sectionUid: string, fieldUid: string) => void;
  onDuplicateField: (sectionUid: string, field: KioskField) => void;
  onMoveField: (sectionUid: string, fromUid: string, toIndex: number) => void;
  onUpdateSection: (sectionUid: string, updates: Partial<KioskSection>) => void;
  onDeleteSection: (sectionUid: string) => void;
  onDuplicateSection: (section: KioskSection) => void;
}> = ({
  section,
  index,
  onAddField,
  onEditField,
  onDeleteField,
  onDuplicateField,
  onMoveField,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
}) => {
  const [isEditingHeading, setIsEditingHeading] = useState(false);
  const [headingText, setHeadingText] = useState(section.heading || section.name || `Section ${index + 1}`);
  const [subheadingText, setSubheadingText] = useState(section.subheading || "");
  const [showSubheadingInput, setShowSubheadingInput] = useState(Boolean(section.subheading));

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ["KIOSK_PALETTE_FIELD"],
      drop: (item: { field_type: string; input_type?: string; label?: string; color?: string }) => {
        onAddField(section._uid, item.field_type, item.input_type, item.label, item.color);
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver({ shallow: true }),
      }),
    }),
    [section._uid, onAddField]
  );

  const saveHeading = () => {
    setIsEditingHeading(false);
    onUpdateSection(section._uid, {
      name: headingText.trim() || `Section ${index + 1}`,
      heading: headingText.trim() || `Section ${index + 1}`,
      subheading: subheadingText.trim() || undefined,
    });
  };

  return (
    <div
      ref={drop as any}
      className={`relative rounded-xl border bg-white shadow-xs transition-all dark:bg-slate-900 ${
        isOver
          ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-blue-950/20"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40 rounded-t-xl">
        <div className="flex flex-1 items-center gap-2">
          {isEditingHeading ? (
            <div className="flex flex-1 flex-col gap-1.5 max-w-md">
              <input
                type="text"
                value={headingText}
                autoFocus
                onChange={(e) => setHeadingText(e.target.value)}
                onBlur={saveHeading}
                onKeyDown={(e) => e.key === "Enter" && saveHeading()}
                className="rounded border border-blue-400 bg-white px-2.5 py-1 text-sm font-semibold text-slate-900 dark:border-blue-500 dark:bg-slate-800 dark:text-white"
                placeholder="Section heading..."
              />
              {showSubheadingInput && (
                <input
                  type="text"
                  value={subheadingText}
                  onChange={(e) => setSubheadingText(e.target.value)}
                  onBlur={saveHeading}
                  onKeyDown={(e) => e.key === "Enter" && saveHeading()}
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  placeholder="Optional section subheading..."
                />
              )}
            </div>
          ) : (
            <div
              className="group/head flex cursor-pointer items-baseline gap-2"
              onClick={() => setIsEditingHeading(true)}
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover/head:text-blue-600 dark:group-hover/head:text-blue-400">
                {section.heading || section.name || `Section ${index + 1}`}
              </h3>
              {section.subheading && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  — {section.subheading}
                </span>
              )}
              <Edit2 className="size-3 text-slate-400 opacity-0 group-hover/head:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Section Actions Menu */}
        <div className="flex items-center gap-1">
          <DataTableRowActionsMenu
            menuAriaLabel="Section options"
            items={[
              {
                id: "edit_heading",
                label: "Edit Heading",
                icon: Edit2,
                onSelect: () => setIsEditingHeading(true),
              },
              {
                id: "toggle_subheading",
                label: showSubheadingInput ? "Edit Subheading" : "Add Subheading",
                icon: Layers,
                onSelect: () => {
                  setShowSubheadingInput(true);
                  setIsEditingHeading(true);
                },
              },
              {
                id: "duplicate_section",
                label: "Duplicate Section",
                icon: Copy,
                onSelect: () => onDuplicateSection(section),
              },
              {
                id: "delete_section",
                label: "Delete Section",
                icon: Trash2,
                tone: "danger",
                onSelect: () => onDeleteSection(section._uid),
              },
            ]}
          />
        </div>
      </div>

      {/* Fields Canvas Area */}
      <div className="p-5">
        {section.fields && section.fields.length > 0 ? (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {section.fields.map((field, fIndex) => (
              <DynamicKioskFieldPreview
                key={field._uid}
                field={field}
                sectionUid={section._uid}
                index={fIndex}
                onEdit={onEditField}
                onDelete={onDeleteField}
                onDuplicate={onDuplicateField}
                onMove={onMoveField}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[90px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <CreditCard className="size-6 text-slate-400 mb-1" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Drag and drop Selection Cards here from the left palette
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Inter-section Drop Zone
const BetweenSectionsDropZone: React.FC<{
  onDropSection: () => void;
  label?: string;
}> = ({ onDropSection, label = 'Drop "Add New Section" here to insert below' }) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ["ADD_SECTION"],
      drop: () => onDropSection(),
      collect: (monitor) => ({ isOver: !!monitor.isOver() }),
    }),
    [onDropSection]
  );

  return (
    <div
      ref={drop as any}
      className={`my-3 flex h-12 items-center justify-center rounded-lg border-2 border-dashed transition-all ${
        isOver
          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30 shadow-xs"
          : "border-transparent hover:border-slate-200 dark:hover:border-slate-800"
      }`}
    >
      <span className="text-xs text-slate-400 dark:text-slate-500">
        {label}
      </span>
    </div>
  );
};

export const KioskBuilder: React.FC<KioskBuilderProps> = ({
  initialConfig = DEFAULT_KIOSK_CONFIG,
  onSave,
  backUrl = routes.dashboard.settingsKiosks,
}) => {
  const router = useRouter();
  const [config, setConfig] = useState<KioskConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<"form" | "rules" | "preview">("form");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [editingFieldModal, setEditingFieldModal] = useState<{
    field: KioskField;
    sectionUid: string;
  } | null>(null);

  // Add new section
  const handleAddSection = useCallback((insertAtIndex?: number) => {
    const newSec: KioskSection = {
      _uid: generateUid("sec_"),
      name: `Section ${(config.sections?.length || 0) + 1}`,
      heading: `Section ${(config.sections?.length || 0) + 1}`,
      column_count: 2,
      sequence: (config.sections?.length || 0) + 1,
      fields: [],
    };

    setConfig((prev) => {
      const currentSections = [...(prev.sections || [])];
      if (insertAtIndex !== undefined && insertAtIndex >= 0) {
        currentSections.splice(insertAtIndex, 0, newSec);
      } else {
        currentSections.push(newSec);
      }
      return { ...prev, sections: currentSections };
    });
  }, [config.sections]);

  // Add field to section
  const handleAddField = useCallback(
    (sectionUid: string, fieldType: string, inputType = "selection_card", label = "Selection Card", color = "#2563EB") => {
      const newField: KioskField = {
        _uid: generateUid("fld_"),
        field_type: fieldType,
        input_type: inputType,
        field_label: label,
        label: label,
        api_name: `card_${Date.now().toString().slice(-4)}`,
        value: label.toLowerCase().replace(/\s+/g, "_"),
        color: color,
        required: false,
      };

      setConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((sec) =>
          sec._uid === sectionUid
            ? { ...sec, fields: [...(sec.fields || []), newField] }
            : sec
        ),
      }));
    },
    []
  );

  // Add field directly from palette click (into first section or create one)
  const handleAddFieldDirectly = useCallback((paletteItem: KioskFieldPaletteItem) => {
    if (!config.sections || config.sections.length === 0) {
      const newSecUid = generateUid("sec_");
      const newField: KioskField = {
        _uid: generateUid("fld_"),
        field_type: paletteItem.field_type,
        input_type: paletteItem.input_type,
        field_label: paletteItem.label,
        label: paletteItem.label,
        api_name: `card_${Date.now().toString().slice(-4)}`,
        value: paletteItem.label.toLowerCase().replace(/\s+/g, "_"),
        color: paletteItem.defaultColor || "#2563EB",
        required: false,
      };
      const newSec: KioskSection = {
        _uid: newSecUid,
        name: "Basic Information",
        heading: "Basic Information",
        column_count: 2,
        sequence: 1,
        fields: [newField],
      };
      setConfig((prev) => ({ ...prev, sections: [newSec] }));
    } else {
      handleAddField(
        config.sections[0]._uid,
        paletteItem.field_type,
        paletteItem.input_type,
        paletteItem.label,
        paletteItem.defaultColor
      );
    }
  }, [config.sections, handleAddField]);

  // Update Section
  const handleUpdateSection = useCallback((sectionUid: string, updates: Partial<KioskSection>) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec._uid === sectionUid ? { ...sec, ...updates } : sec
      ),
    }));
  }, []);

  // Delete Section
  const handleDeleteSection = useCallback((sectionUid: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.filter((sec) => sec._uid !== sectionUid),
    }));
  }, []);

  // Duplicate Section
  const handleDuplicateSection = useCallback((section: KioskSection) => {
    const duplicatedSec: KioskSection = {
      ...section,
      _uid: generateUid("sec_"),
      name: `${section.name} (Copy)`,
      heading: `${section.heading || section.name} (Copy)`,
      fields: (section.fields || []).map((f) => ({
        ...f,
        _uid: generateUid("fld_"),
        api_name: `${f.api_name}_copy`,
      })),
    };

    setConfig((prev) => ({
      ...prev,
      sections: [...prev.sections, duplicatedSec],
    }));
  }, []);

  // Field operations
  const handleEditField = useCallback((field: KioskField, sectionUid: string) => {
    setEditingFieldModal({ field, sectionUid });
  }, []);

  const handleSaveFieldConfig = useCallback((updatedField: KioskField) => {
    if (!editingFieldModal) return;
    const { sectionUid } = editingFieldModal;
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec._uid === sectionUid
          ? {
              ...sec,
              fields: sec.fields.map((f) =>
                f._uid === updatedField._uid ? updatedField : f
              ),
            }
          : sec
      ),
    }));
    setEditingFieldModal(null);
  }, [editingFieldModal]);

  const handleDeleteField = useCallback((sectionUid: string, fieldUid: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec._uid === sectionUid
          ? { ...sec, fields: sec.fields.filter((f) => f._uid !== fieldUid) }
          : sec
      ),
    }));
  }, []);

  const handleDuplicateField = useCallback((sectionUid: string, field: KioskField) => {
    const duplicated: KioskField = {
      ...field,
      _uid: generateUid("fld_"),
      api_name: `${field.api_name}_copy`,
      field_label: `${field.field_label || field.label} (Copy)`,
      label: `${field.field_label || field.label} (Copy)`,
    };
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec._uid === sectionUid
          ? { ...sec, fields: [...sec.fields, duplicated] }
          : sec
      ),
    }));
  }, []);

  const handleMoveField = useCallback((sectionUid: string, fromUid: string, toIndex: number) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec._uid !== sectionUid) return sec;
        const currentFields = [...sec.fields];
        const fromIndex = currentFields.findIndex((f) => f._uid === fromUid);
        if (fromIndex < 0) return sec;
        const [moved] = currentFields.splice(fromIndex, 1);
        currentFields.splice(toIndex, 0, moved);
        return { ...sec, fields: currentFields };
      }),
    }));
  }, []);

  // Top Action Handlers
  const handleSaveOnly = () => {
    onSave?.(config);
    toastSuccess("Kiosk saved successfully");
  };

  const handleSaveAndClose = () => {
    onSave?.(config);
    toastSuccess("Kiosk saved successfully");
    router.push(backUrl as any);
  };

  const handleClose = () => {
    router.push(backUrl as any);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        data-full-bleed-page
        className="dashboard-full-bleed-page flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-100/60 dark:bg-slate-950 font-sans"
      >
        {/* Top Navigation Bar - Exact layout from Image 1 */}
        <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          {/* Left: Form Name Input */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="mr-1 flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Enter Kiosk Name"
                className="h-8 max-w-[240px] rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none dark:text-white dark:hover:border-slate-700 dark:focus:bg-slate-800"
              />
              <span className="text-red-500 font-bold">*</span>
            </div>
          </div>

          {/* Center: Tabs (Form, Rules, Preview) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("form")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "form"
                  ? "border-b-2 border-black text-black dark:border-white dark:text-white font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              Form
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "preview"
                  ? "border-b-2 border-black text-black dark:border-white dark:text-white font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              Preview
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {activeTab === "preview" && (
              <div className="mr-2 flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex size-7 items-center justify-center rounded ${
                    previewDevice === "desktop"
                      ? "bg-white shadow-xs dark:bg-slate-700 text-blue-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="size-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex size-7 items-center justify-center rounded ${
                    previewDevice === "mobile"
                      ? "bg-white shadow-xs dark:bg-slate-700 text-blue-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="size-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Close
            </button>
            <button
              onClick={handleSaveAndClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Save and Close
            </button>
            <button
              onClick={handleSaveOnly}
              className="rounded-md bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-black/90 dark:bg-white dark:text-black"
            >
              Save
            </button>
          </div>
        </header>

        {/* Builder / Preview Viewport */}
        {activeTab === "form" ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Left ModuleBar Palette */}
            <KioskModuleBar
              onAddSection={() => handleAddSection()}
              onAddFieldDirectly={handleAddFieldDirectly}
            />

            {/* Canvas Area */}
            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="mx-auto max-w-4xl space-y-4 pb-20">
                {/* Top Drop Zone */}
                <BetweenSectionsDropZone
                  onDropSection={() => handleAddSection(0)}
                  label='Drop "Add New Section" here to insert at the top'
                />

                {/* Sections List */}
                {config.sections && config.sections.length > 0 ? (
                  config.sections.map((section, sIndex) => (
                    <React.Fragment key={section._uid}>
                      <SectionDropZone
                        section={section}
                        index={sIndex}
                        onAddField={handleAddField}
                        onEditField={handleEditField}
                        onDeleteField={handleDeleteField}
                        onDuplicateField={handleDuplicateField}
                        onMoveField={handleMoveField}
                        onUpdateSection={handleUpdateSection}
                        onDeleteSection={handleDeleteSection}
                        onDuplicateSection={handleDuplicateSection}
                      />

                      {/* Dropzone between sections */}
                      <BetweenSectionsDropZone
                        onDropSection={() => handleAddSection(sIndex + 1)}
                        label='Drop "Add New Section" here to insert below'
                      />
                    </React.Fragment>
                  ))
                ) : (
                  <div className="my-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 mb-3">
                      <Layers className="size-7" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                      Empty Kiosk Canvas
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                      Drag and drop "Add New Section" from the left sidebar or click below to start creating your kiosk flow.
                    </p>
                    <button
                      onClick={() => handleAddSection()}
                      className="mt-4 flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black/90 dark:bg-white dark:text-black"
                    >
                      <Plus className="size-4" />
                      Add First Section
                    </button>
                  </div>
                )}
              </div>
            </main>
          </div>
        ) : (
          /* Live Preview Mode */
          <main className="flex flex-1 items-center justify-center overflow-y-auto p-6 custom-scrollbar bg-slate-200/60 dark:bg-slate-950">
            <div
              className={`w-full transition-all duration-300 ${
                previewDevice === "mobile"
                  ? "max-w-sm rounded-3xl border-8 border-slate-800 bg-white shadow-2xl overflow-hidden min-h-[700px] dark:bg-slate-900"
                  : "max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="p-6 md:p-8">
                <KioskRenderer
                  config={config}
                  onSubmit={(values) => {
                    console.log("Kiosk simulated submit values:", values);
                    toastSuccess("Simulated kiosk submission recorded!");
                  }}
                />
              </div>
            </div>
          </main>
        )}

        {/* Modal: Configure Field with Live Preview */}
        {editingFieldModal && (
          <KioskFieldConfigModal
            field={editingFieldModal.field}
            onSave={handleSaveFieldConfig}
            onClose={() => setEditingFieldModal(null)}
          />
        )}
      </div>
    </DndProvider>
  );
};