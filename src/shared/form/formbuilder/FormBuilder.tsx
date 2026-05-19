import React, { useState, useEffect } from "react";
import FieldConfigModal from "../components/FieldConfigModal";
import { useDrop } from "react-dnd";
import DynamicFieldPreview from "../components/DynamicFieldPreview";
import ModuleBar from "../components/ModuleBar";
import { GoGear } from "react-icons/go";
import {
  DataTableRowActionsMenu,
  DataTableRowMenuItem,
} from "@/shared/ui/data-table-row-actions-menu";
import { AppButton as Button } from "@/shared/ui/app-button";
import { useFormStore } from "@/features/form-builder/store/form-builder.store";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";
import { useSearchParams, useRouter, useParams } from "next/navigation";

interface Field {
  _uid: string;
  id?: string | number;
  field_type: string;
  field_label: string;
  api_name: string;
  order: number;
  is_deleted?: boolean;
  is_active?: boolean;
  original_name?: string;
  [key: string]: any;
}

interface Section {
  _uid: string;
  id?: string | number;
  name: string;
  column_count: number;
  is_subform?: boolean;
  is_deleted?: boolean;
  is_active?: boolean;
  fields: Field[];
}

interface TopDropZoneProps {
  onDrop: (isSubform: boolean) => void;
}

const TopDropZone: React.FC<TopDropZoneProps> = ({ onDrop }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ["ADD_SECTION", "ADD_SUBFORM"],
    drop: (item: { type: string }) => {
      onDrop(item.type === "ADD_SUBFORM");
    },
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  return (
    <div
      ref={drop as any}
      className={`h-16 rounded-md p-2 transition-all ${isOver
        ? "border-blue-400 bg-blue-50 shadow-md"
        : "border-dashed border-transparent"
        }`}
    >
      <div className="text-center h-full text-sm text-gray-500 mt-6">
        Drop "Add New Section" here to insert at the top
      </div>
    </div>
  );
};

interface SectionDropZoneProps {
  section: Section;
  editingSectionId: string | null;
  tempName: string;
  setTempName: (name: string) => void;
  saveSectionName: () => void;
  setEditingSectionId: (id: string | null) => void;
  setShowModal: (modal: any) => void;
  addNewSectionAfter: (afterUid: string | null, isSubform: boolean) => void;
  deleteSection: (sectionUid: string) => void;
  handleColumnChange: (sectionUid: string, columns: number) => void;
  deleteField: (sectionUid: string, fieldUid: string) => void;
  moveField: (sectionUid: string, fromUid: string, toFilteredIndex: number) => void;
}

const SectionDropZone: React.FC<SectionDropZoneProps> = ({
  section,
  editingSectionId,
  tempName,
  setTempName,
  saveSectionName,
  setEditingSectionId,
  setShowModal,
  addNewSectionAfter,
  deleteSection,
  handleColumnChange,
  deleteField,
  moveField,
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ["FIELD"],
    drop: (item: { type: string, _uid?: string }) => {
      if (item._uid) return;
      setShowModal({ type: item.type, sectionUid: section._uid });
    },
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  const [{ isOver: isOverAdd }, addDrop] = useDrop(() => ({
    accept: ["ADD_SECTION", "ADD_SUBFORM"],
    drop: (item: { type: string }) => {
      addNewSectionAfter(section._uid, item.type === "ADD_SUBFORM");
    },
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  const isEditing = editingSectionId === section._uid;

  return (
    <>
      <div
        className={`border rounded-[4px] border-gray-200 w-full overflow-hidden`}
      >
        <div
          className={`bg-gray-100 px-6 py-4 flex items-center justify-between`}
        >
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={saveSectionName}
              onKeyDown={(e) => e.key === "Enter" && saveSectionName()}
              onKeyUp={(e) => e.key === "Escape" && setEditingSectionId(null)}
              className="text-xl font-semibold text-gray-900 bg-white border border-blue-400 rounded px-3 py-1 outline-none focus:border-blue-600"
              placeholder="Section name..."
            />
          ) : (
            <h3
              onClick={() => {
                setEditingSectionId(section._uid);
                setTempName(section.name);
              }}
              className={`text-xl font-semibold cursor-pointer text-gray-600 hover:text-gray-700`}
            >
              {section.name || "Untitled Section"}
            </h3>
          )}
          {!section.is_subform && (
            <DataTableRowActionsMenu
              menuAriaLabel="Section Settings"
              items={[
                {
                  id: "single-col",
                  label: "Single Column",
                  onSelect: () => handleColumnChange(section._uid, 1),
                },
                {
                  id: "double-col",
                  label: "Double Column",
                  onSelect: () => handleColumnChange(section._uid, 2),
                },
                {
                  id: "delete",
                  label: "Delete the section",
                  tone: "danger",
                  onSelect: () => deleteSection(section._uid),
                },
              ]}
            />
          )}
          {section.is_subform && (
            <div
              className="text-red-500 cursor-pointer hover:text-red-700 text-sm font-medium"
              onClick={() => deleteSection(section._uid)}
            >
              Delete subform
            </div>
          )}
        </div>

        <div
          ref={drop as any}
          className={`min-h-[150px] bg-white rounded-[8px] p-6 transition-all ${section.fields.length === 0
            ? "flex items-center justify-center border-dotted border-2 border-gray-300"
            : ""
            } ${isOver ? "border-blue-500 bg-blue-50 shadow-sm" : ""}`}
        >
          {section.fields.length === 0 ? (
            <div className="flex items-center justify-center w-full">
              <p className="text-center text-gray-400">Drop fields here</p>
            </div>
          ) : section.is_subform ? (
            <div className="w-0 min-w-full overflow-hidden">
              <div className="flex border border-gray-200 rounded-lg overflow-x-auto bg-gray-50/30 max-w-full custom-scrollbar">
                {section.fields
                  .filter((f) => !f.is_deleted)
                  .map((field, idx) => (
                    <div
                      key={field._uid}
                      className="min-w-[200px] flex-shrink-0"
                    >
                      <DynamicFieldPreview
                        field={field}
                        modalsetter={setShowModal}
                        sectionUid={section._uid}
                        deleteField={deleteField}
                        index={idx}
                        moveField={moveField}
                        isSubform={true}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div
              className={`grid gap-8 ${section.column_count === 2 ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {section.fields
                .filter((f) => !f.is_deleted)
                .map((field, idx) => (
                  <div
                    key={field._uid}
                    className="transform transition-all hover:scale-105 cursor-pointer"
                  >
                    <DynamicFieldPreview
                      field={field}
                      modalsetter={setShowModal}
                      sectionUid={section._uid}
                      deleteField={deleteField}
                      index={idx} // This is the filtered index
                      moveField={moveField}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div
        ref={addDrop as any}
        className={`h-16 rounded-md p-2 transition-all ${isOverAdd
          ? "border-blue-400 bg-blue-50 shadow-md"
          : "border-dashed border-transparent"
          }`}
      >
        <div className="text-center h-full text-sm text-gray-500 mt-6 border-dotted">
          Drop "Add New Section" here to insert below
        </div>
      </div>
    </>
  );
};

interface FormBuilderLayoutProps {
  activeModule: string;
  layoutId?: string | number;
}

export default function FormBuilderLayout({ activeModule, layoutId }: FormBuilderLayoutProps) {
  const {
    formSchema,
    createForm,
    createModule,
    editForm,
    getFormSchema,
    getFormSchemaById,
    clearSchema,
  } = useFormStore();

  const searchParams = useSearchParams();
  const purpose = searchParams.get("purpose");
  const router = useRouter();
  const params = useParams();
  const routeModuleId = params?.id as string;
  const targetModule = routeModuleId || activeModule || "untitled module";
  const resolvedLayoutId = layoutId || searchParams.get("layout_id") || searchParams.get("layoutId") || undefined;

  const [moduleName, setModuleName] = useState(
    purpose === "create_layout" ? "New Layout" : (purpose === "edit_layout" ? "Loading Layout..." : (targetModule || "Untitled"))
  );

  const [sections, setSections] = useState<Section[]>([
    { _uid: "basic", name: "Basic Information", column_count: 2, fields: [] },
  ]);

  useEffect(() => {
    clearSchema();
    return () => {
      clearSchema();
    };
  }, [clearSchema, resolvedLayoutId, targetModule, purpose]);

  useEffect(() => {
    const loadSchema = async () => {
      if (purpose === "edit_layout" && resolvedLayoutId) {
        const data = await getFormSchemaById(resolvedLayoutId, routeModuleId);
        const layoutObj = data?.data || data;
        if (layoutObj?.name) {
          setModuleName(layoutObj.name);
        } else if (layoutObj?.layout?.name) {
          setModuleName(layoutObj.layout.name);
        }
      } else if (purpose !== "create_module" && purpose !== "create_layout" && purpose !== "edit_layout") {
        const data = await getFormSchema(targetModule);
        const layoutObj = data?.data || data;
        if (layoutObj?.name) {
          setModuleName(layoutObj.name);
        }
      }
    };
    loadSchema();
  }, [resolvedLayoutId, targetModule, purpose]);

  useEffect(() => {
    if (formSchema && formSchema.length > 0) {
      const initializedSections: Section[] = formSchema.map((sec: any, sIdx: number) => ({
        ...sec,
        _uid: sec.id?.toString() || `section-${sIdx}-${Date.now()}`,
        name: sec.name || sec.sectionHeader || "",
        column_count: sec.column_count || sec.columns || 2,
        fields: (sec.fields || [])
          .sort((a: any, b: any) => (a.sequence ?? a.order ?? 0) - (b.sequence ?? b.order ?? 0))
          .map((f: any, fIdx: number) => {
            const validationRules: any = {};
            if (f.properties?.validation_rules) {
              Object.keys(f.properties.validation_rules).forEach((key) => {
                const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                validationRules[camelKey] = f.properties.validation_rules[key];
              });
            }

            return {
              ...f,
              _uid: f.id?.toString() || `field-${fIdx}-${Date.now()}`,
              order: f.order ?? f.sequence ?? fIdx,
              original_name: f.api_name || f.name,
              field_label: f.field_label || f.label || "",
              api_name: f.api_name || f.name || "",
              field_type: f.field_type || f.type || "",
              required: f.required !== undefined ? f.required : (f.properties?.is_required || false),
              is_searchable: f.is_searchable !== undefined ? f.is_searchable : (f.properties?.is_searchable || false),
              is_filterable: f.is_filterable !== undefined ? f.is_filterable : (f.properties?.is_filterable || false),
              is_sortable: f.is_sortable !== undefined ? f.is_sortable : (f.properties?.is_sortable || false),
              is_public: f.is_public !== undefined ? f.is_public : (f.properties?.is_public || false),
              ...validationRules,
            };
          }),
      }));
      setSections(initializedSections);
    } else if (purpose === "create_module" || purpose === "create_layout") {
      setSections([
        {
          _uid: "basic",
          name: "Basic Information",
          column_count: 2,
          fields: [],
        },
      ]);
    }
  }, [formSchema, targetModule, purpose]);

  const [showModal, setShowModal] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  const addFieldToSection = (sectionUid: string, fieldConfig: any) => {
    if (!sectionUid) return;
    setSections((prev) =>
      prev.map((sec) =>
        sec._uid === sectionUid
          ? {
            ...sec,
            fields: [
              ...sec.fields,
              {
                _uid: `${Date.now()}`,
                order: sec.fields.length,
                ...fieldConfig,
              },
            ],
          }
          : sec,
      ),
    );
    setShowModal(null);
    setDirty(true);
  };

  const updateFieldInSection = (sectionUid: string, fieldUid: string, newConfig: any) => {
    if (!sectionUid || !fieldUid) return;
    setSections((prev) =>
      prev.map((sec) =>
        sec._uid === sectionUid
          ? {
            ...sec,
            fields: sec.fields.map((f) =>
              f._uid === fieldUid ? { ...f, ...newConfig } : f,
            ),
          }
          : sec,
      ),
    );
    setShowModal(null);
    setDirty(true);
  };

  const addNewSectionAfter = (afterUid: string | null = null, isSubform = false) => {
    const newSection: Section = {
      _uid: `section-${Date.now()}`,
      name: "",
      column_count: isSubform ? 1 : 2,
      is_subform: isSubform,
      fields: [],
    };
    setSections((prev) => {
      if (afterUid === "__TOP__") return [newSection, ...prev];
      if (!afterUid) return [...prev, newSection];
      const index = prev.findIndex((s) => s._uid === afterUid);
      const copy = [...prev];
      copy.splice(index + 1, 0, newSection);
      return copy;
    });
    setDirty(true);
    setTimeout(() => {
      setEditingSectionId(newSection._uid);
      setTempName("");
    }, 100);
  };

  const saveSectionName = () => {
    const name = tempName.trim() || "Untitled Section";
    setSections((prev) =>
      prev.map((s) =>
        s._uid === editingSectionId ? { ...s, name } : s,
      ),
    );
    setEditingSectionId(null);
    setTempName("");
    setDirty(true);
  };

  const deleteSection = (sectionUid: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s._uid === sectionUid
          ? {
            ...s,
            is_active: false,
            is_deleted: true,
            fields: (s.fields || []).map((f) => ({
              ...f,
              is_active: false,
              is_deleted: true,
            })),
          }
          : s,
      ),
    );
    setDirty(true);
  };

  const handleColumnChange = (sectionUid: string, newColumns: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s._uid === sectionUid ? { ...s, column_count: newColumns } : s,
      ),
    );
    setDirty(true);
  };

  const handleSave = async (isClose = false) => {
    try {
      setSaving(true);
      const isNew = !formSchema || formSchema.length === 0;

      const formatFieldPayload = (f: any, fIdx: number) => {
        const fieldPayload: any = {
          field_label: f.field_label,
          api_name: f.api_name,
          field_type: f.field_type,
          sequence: fIdx + 1,
        };

        if (f.placeholder) fieldPayload.placeholder = f.placeholder;
        if (f.helpText) fieldPayload.help_text = f.helpText;
        if (f.options && f.options.length > 0) fieldPayload.options = f.options;

        const validationRules: any = {};
        const excludeKeys = [
          "id", "_uid", "field_label", "api_name", "field_type", "order", "original_name",
          "is_deleted", "is_active", "placeholder", "helpText", "options",
          "required", "is_searchable", "is_filterable", "is_sortable", "is_public",
          "markAsPublic", "show_tooltip", "tool_tip", "properties"
        ];
        
        Object.keys(f).forEach((key) => {
          if (!excludeKeys.includes(key)) {
            // convert camelCase to snake_case
            const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
            validationRules[snakeKey] = f[key];
          }
        });

        fieldPayload.properties = {
          is_required: f.required || false,
          is_searchable: f.is_searchable || false,
          is_filterable: f.is_filterable || false,
          is_sortable: f.is_sortable || false,
          is_public: f.is_public || false,
          validation_rules: validationRules,
        };

        if (f.properties?.id) {
          fieldPayload.properties.id = f.properties.id;
        }

        return fieldPayload;
      };

      let finalPayload: any;

      if (purpose === "edit_layout") {
        // Build differential update structure as requested by the API
        const createdSections = sections
          .filter((sec) => !sec.is_deleted && (!sec.id || String(sec.id).startsWith("section-")))
          .map((sec, secIdx) => {
            const activeFields = (sec.fields || []).filter((f) => !f.is_deleted);
            return {
              name: sec.name,
              sequence: secIdx + 1,
              column_count: sec.column_count,
              fields: activeFields.map((f, fIdx) => formatFieldPayload(f, fIdx)),
            };
          });

        const updatedSections = sections
          .filter((sec) => !sec.is_deleted && sec.id && !String(sec.id).startsWith("section-"))
          .map((sec, secIdx) => {
            const activeFields = (sec.fields || [])
              .filter((f) => !f.is_deleted)
              .map((f, fIdx) => {
                const payload = formatFieldPayload(f, fIdx);
                if (f.id && !String(f.id).startsWith("field-")) {
                  payload.id = Number(f.id) || f.id;
                }
                return payload;
              });

            return {
              id: Number(sec.id) || sec.id,
              name: sec.name,
              sequence: secIdx + 1,
              column_count: sec.column_count,
              fields: activeFields,
            };
          });

        const deletedSections = sections
          .filter((sec) => sec.is_deleted && sec.id && !String(sec.id).startsWith("section-"))
          .map((sec) => {
            return {
              id: Number(sec.id) || sec.id,
              fields: [],
            };
          });

        const allDeletedFields: any[] = [];
        sections
          .filter((sec) => !sec.is_deleted)
          .forEach((sec) => {
            (sec.fields || []).forEach((f) => {
              if (f.is_deleted && f.id && !String(f.id).startsWith("field-")) {
                allDeletedFields.push({ id: Number(f.id) || f.id });
              }
            });
          });

        const finalDeletePayload: any[] = [...deletedSections];
        if (allDeletedFields.length > 0) {
          finalDeletePayload.push({
            fields: allDeletedFields,
          });
        }

        finalPayload = {
          layout: {
            name: moduleName,
            description: "",
            sequence: 1,
            is_active: false,
          },
          name: moduleName,
          create: createdSections,
          update: updatedSections,
          delete: finalDeletePayload,
        };
      } else {
        // Fallback/standard flat payload for fresh create_module / create_layout
        const sectionsPayload = sections
          .filter((sec) => !sec.is_deleted)
          .map((sec: any, secIdx: number) => {
            const secPayload: any = {
              name: sec.name,
              sequence: secIdx + 1,
              column_count: sec.column_count,
            };

            if (sec.id && !String(sec.id).startsWith("section-")) {
              secPayload.id = Number(sec.id) || sec.id;
            }

            const activeFields = (sec.fields || []).filter((f: any) => !f.is_deleted);
            secPayload.fields = activeFields.map((f: any, fIdx: number) => {
              const payload = formatFieldPayload(f, fIdx);
              if (f.id && !String(f.id).startsWith("field-")) {
                payload.id = Number(f.id) || f.id;
              }
              return payload;
            });

            return secPayload;
          });

        if (purpose === "create_module") {
          finalPayload = {
            module: {
              name: moduleName,
              api_name: moduleName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
              singular_label: moduleName,
              plural_label: moduleName,
              description: "",
              icon: "",
              color: "",
              is_active: true,
            },
            sections: sectionsPayload,
          };
        } else {
          finalPayload = {
            layout: {
              name: moduleName,
              description: "",
              sequence: 1,
              is_active: false,
            },
            sections: sectionsPayload,
          };
        }
      }

      if (purpose === "create_module") {
        await createModule(finalPayload);
      } else if (purpose === "create_layout") {
        await createForm(targetModule, finalPayload, purpose);
      } else {
        if (purpose === "edit_layout" && resolvedLayoutId) {
          await editForm(resolvedLayoutId, finalPayload, routeModuleId, purpose);
        } else if (isNew) {
          await createForm(targetModule, finalPayload, purpose);
        } else if (resolvedLayoutId) {
          await editForm(resolvedLayoutId, finalPayload, routeModuleId, purpose);
        }
      }

      setDirty(false);

      if (isClose) {
        if (purpose === "create_module") {
          router.push("/dashboard/settings/modules");
        } else if (purpose === "create_layout" || purpose === "edit_layout") {
          router.push(`/dashboard/settings/modules/${targetModule}/layout`);
        } else {
          router.back();
        }
      }
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteField = (sectionUid: string, fieldUid: string) => {
    setSections((prev) =>
      prev.map((sec) =>
        sec._uid === sectionUid
          ? {
            ...sec,
            fields: sec.fields.map((f) =>
              f._uid === fieldUid
                ? { ...f, is_active: false, is_deleted: true }
                : f,
            ),
          }
          : sec,
      ),
    );
    setDirty(true);
  };

  const moveField = (sectionUid: string, fromUid: string, toFilteredIndex: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec._uid !== sectionUid) return sec;
        const allFields = [...sec.fields];
        const fromIndex = allFields.findIndex((f) => f._uid === fromUid);
        const visibleFields = allFields.filter((f) => !f.is_deleted);
        const targetField = visibleFields[toFilteredIndex];
        const toIndex = allFields.indexOf(targetField);

        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex)
          return sec;

        const [moved] = allFields.splice(fromIndex, 1);
        allFields.splice(toIndex, 0, moved);

        const reorderedFields = allFields.map((f, idx) => ({
          ...f,
          order: idx,
        }));

        return { ...sec, fields: reorderedFields };
      }),
    );
    setDirty(true);
  };

  const sidebarOpen = useDashboardSidebarStore((s) => s.sidebarOpen);
  // The content area already starts after the sidebar in the flex layout,
  // so we only need to offset by the ModuleBar width (288px = w-72)
  const sidebarW = sidebarOpen ? 200 : 42;
  const canvasMarginLeft = 288;

  return (
    <div className="relative flex flex-col h-full">
      {/* Responsive Sub-header (Single Row) */}
      <div
        className="fixed top-14 z-20 flex border-t border-gray-200 dark:border-gray-700 items-center justify-between h-14 px-6 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 transition-all duration-300"
        style={{
          left: sidebarW,
          width: `calc(100% - ${sidebarW}px)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full opacity-80" />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={moduleName}
              onChange={(e) => {
                setModuleName(e.target.value);
                setDirty(true);
              }}
              className="font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-auto max-w-[200px]"
              placeholder="Untitled"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              setSections([
                {
                  _uid: "basic",
                  name: "Basic Information",
                  column_count: 2,
                  fields: [],
                },
              ])
            }
          >
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => handleSave(true)} disabled={!dirty || saving}>
            Save and Close
          </Button>
          <Button onClick={() => handleSave(false)} disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <ModuleBar />

      {/* Main builder canvas offset past sidebar + ModuleBar */}
      <div
        className="p-6 transition-all duration-300 pt-10"
        style={{ marginLeft: canvasMarginLeft }}
      >
        <div className="mx-auto">
          <div className="space-y-4">
            <TopDropZone
              onDrop={(isSubform) => addNewSectionAfter("__TOP__", isSubform)}
            />
            {sections
              ?.filter((s) => !s.is_deleted)
              .map((section) => (
                <SectionDropZone
                  key={section?._uid}
                  section={section}
                  editingSectionId={editingSectionId}
                  tempName={tempName}
                  setTempName={setTempName}
                  saveSectionName={saveSectionName}
                  setEditingSectionId={setEditingSectionId}
                  setShowModal={setShowModal}
                  addNewSectionAfter={addNewSectionAfter}
                  deleteSection={deleteSection}
                  handleColumnChange={handleColumnChange}
                  deleteField={deleteField}
                  moveField={moveField}
                />
              ))}


          </div>
        </div>
      </div>


      {showModal && (
        <FieldConfigModal
          fieldType={showModal?.type}
          initialConfig={showModal?.config || null}
          onSave={(config: any) => {
            if (showModal._fieldUid) {
              updateFieldInSection(
                showModal?.sectionUid,
                showModal?._fieldUid,
                config,
              );
            } else {
              addFieldToSection(showModal?.sectionUid, config);
            }
          }}
          onClose={() => setShowModal(null)}
        />
      )}
    </div>
  );
}
