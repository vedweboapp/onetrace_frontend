import React, { useState, useEffect, useRef } from "react";
import { useFormHandler } from "../hook/useFormHandler";
import FieldConfigModal from "../components/FieldConfigModal";
import { useDrop } from "react-dnd";
import DynamicFieldPreview from "../components/DynamicFieldPreview";
import ModuleBar from "../components/ModuleBar";
import { GoGear } from "react-icons/go";
import { DataTableRowActionsMenu } from "@/shared/ui/data-table-row-actions-menu";
import { AppButton, AppButton as Button } from "@/shared/ui/app-button";
import { fieldRequiredMarkClassName } from "@/shared/ui/field-primitives";
import { cn } from "@/core/utils/http.util";
import { useFormStore } from "@/features/form-builder/store/form-builder.store";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";
import { routes } from "@/shared/config/routes";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { AppTabs } from "@/shared/ui/app-tabs";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { useTranslations } from "next-intl";
import api from "@/core/api/axios";
import FormRenderer, { FormRendererRef } from "./FormRenderer";
import FormRuleModal from "./form-rule-modal";
import RuleTypeModal from "../components/RuleTypeModal";
import FormAdvancedRuleModal from "./form-advanced-rule-modal";
import {
  FIELD_RULE_TARGET_PREFIX,
  FormRule,
  SECTION_RULE_TARGET_PREFIX,
} from "./form-rules.types";
import type { RuleFieldOption } from "./rule-field-select";
import { Edit2, Monitor, Smartphone, Trash2 } from "lucide-react";
import type { FormBuilderApiHandlers } from "./form-builder.handlers";

interface Field {
  _uid: string;
  id?: string | number;
  u_id?: string;
  s_id?: number | string | null;
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
  s_id?: number | string | null;
  name: string;
  column_count: number;
  sequence?: number;
  is_subform?: boolean;
  is_deleted?: boolean;
  is_active?: boolean;
  is_custom?: boolean;
  fields: Field[];
}

/** Keep section.sequence aligned with builder order (active sections only). */
const reindexSectionSequences = (sections: Section[]): Section[] => {
  let seq = 1;
  return sections.map((section) => {
    if (section.is_deleted) return section;
    return { ...section, sequence: seq++ };
  });
};

type CreatedFormResponse = {
  id?: string | number;
  form_id?: string | number;
  data?: {
    id?: string | number;
    form_id?: string | number;
  };
};

const getCreatedFormId = (
  response: CreatedFormResponse | null | undefined,
): string | number | undefined =>
  response?.form_id ??
  response?.id ??
  response?.data?.form_id ??
  response?.data?.id;

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
        ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40 shadow-md"
        : "border-dashed border-transparent"
        }`}
    >
      <div className="text-center h-full text-sm text-gray-500 dark:text-gray-400 mt-6">
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
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  setDirty: (dirty: boolean) => void;
  addNewSectionAfter: (afterUid: string | null, isSubform: boolean) => void;
  deleteSection: (sectionUid: string) => void;
  handleColumnChange: (sectionUid: string, columns: number) => void;
  deleteField: (sectionUid: string, fieldUid: string) => void;
  moveField: (
    sectionUid: string,
    fromUid: string,
    toFilteredIndex: number,
  ) => void;
}

const SectionDropZone: React.FC<SectionDropZoneProps> = ({
  section,
  editingSectionId,
  tempName,
  setTempName,
  saveSectionName,
  setEditingSectionId,
  setShowModal,
  setSections,
  setDirty,
  addNewSectionAfter,
  deleteSection,
  handleColumnChange,
  deleteField,
  moveField,
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ["FIELD", "ADDRESS", "address"],
    drop: (item: { type: string; _uid?: string }) => {
      if (item._uid) return;
      if (item.type === "address" || item.type === "ADDRESS") {
        const newSectionUid = `section-${Date.now()}`;
        const addressFields = [
          {
            _uid: `${Date.now()}-country`,
            field_type: "country",
            field_label: "Country",
            api_name: "country",
            order: 0,
          },
          {
            _uid: `${Date.now()}-state`,
            field_type: "state",
            field_label: "State",
            api_name: "state",
            order: 1,
          },
          {
            _uid: `${Date.now()}-city`,
            field_type: "city",
            field_label: "City",
            api_name: "city",
            order: 2,
          },
          {
            _uid: `${Date.now()}-zip`,
            field_type: "zip",
            field_label: "Zip Code",
            api_name: "zip_code",
            order: 3,
          },
        ];
        setSections((prev) => {
          const copy = [...prev];
          const index = copy.findIndex((s) => s._uid === section._uid);
          const newSection = {
            _uid: newSectionUid,
            name: "Address",
            column_count: 2,
            is_subform: false,
            fields: addressFields,
          };
          copy.splice(index + 1, 0, newSection);
          return reindexSectionSequences(copy);
        });
        setDirty(true);
        return;
      }
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
      <div className="border rounded-[4px] border-gray-200 dark:border-slate-700 w-full overflow-hidden">
        <div className="bg-gray-100 dark:bg-slate-800 px-3 py-2 lg:px-6 lg:py-4 flex items-center justify-between">
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={saveSectionName}
              onKeyDown={(e) => e.key === "Enter" && saveSectionName()}
              onKeyUp={(e) => e.key === "Escape" && setEditingSectionId(null)}
              className="text-xl font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-500 rounded px-3 py-1 outline-none focus:border-blue-600 dark:focus:border-blue-400"
              placeholder="Section name..."
            />
          ) : (
            <h3
              onClick={() => {
                setEditingSectionId(section._uid);
                setTempName(section.name);
              }}
              className="text-xl font-semibold cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100"
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
          className={`min-h-[150px] bg-white dark:bg-slate-900 rounded-[8px] p-3 lg:p-6 transition-all ${section.fields.length === 0
            ? "flex items-center justify-center border-dotted border-2 border-gray-300 dark:border-slate-600"
            : ""
            } ${isOver ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-sm" : ""}`}
        >
          {section.fields.length === 0 ? (
            <div className="flex items-center justify-center w-full">
              <p className="text-center text-gray-400 dark:text-gray-500">
                Drop fields here
              </p>
            </div>
          ) : section.is_subform ? (
            <div className="w-0 min-w-full overflow-hidden">
              <div className="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-x-auto bg-gray-50/30 dark:bg-slate-800/50 max-w-full custom-scrollbar">
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
              className={`grid gap-2 lg:gap-8 ${section.column_count === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
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
          ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40 shadow-md"
          : "border-dashed border-transparent"
          }`}
      >
        <div className="text-center h-full text-sm text-gray-500 dark:text-gray-400 mt-6 border-dotted">
          Drop "Add New Section" here to insert below
        </div>
      </div>
    </>
  );
};

interface FormBuilderLayoutProps {
  activeModule: string;
  layoutId?: string | number;
  /** Injectable API handlers — when provided for a specific purpose, the builder
   *  delegates create/update/rules calls to these instead of the default store. */
  apiHandlers?: FormBuilderApiHandlers;
  BackUrl: string;
  /** The project-type route id; forwarded to handlers via HandlerContext. */
  projectTypeId?: string;
}

/**
 * Generate a unique api_name by appending numbers if duplicate found.
 * First occurrence keeps original name, subsequent ones get _1, _2, etc.
 */
const getUniqueApiName = (desiredApiName: string, sections: Section[]): string => {
  let nameExists = false;
  let maxNumber = 0;

  sections.forEach((section) => {
    section.fields?.forEach((field) => {
      if (field.api_name === desiredApiName) {
        nameExists = true;
      }
      // Check for numbered versions: name_1, name_2, etc.
      const numberMatch = field.api_name.match(
        new RegExp(`^${desiredApiName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_(\\d+)$`)
      );
      if (numberMatch) {
        maxNumber = Math.max(maxNumber, parseInt(numberMatch[1], 10));
      }
    });
  });

  if (!nameExists) {
    return desiredApiName;
  }

  return `${desiredApiName}_${maxNumber + 1}`;
};

export default function FormBuilderLayout({
  activeModule,
  layoutId,
  apiHandlers,
  BackUrl,
  projectTypeId,
}: FormBuilderLayoutProps) {
  const t = useTranslations("Dashboard.settingsFormBuilder");
  const {
    formSchema,
    createForm,
    createModule,
    editForm,
    getFormSchema,
    getFormSchemaById,
    clearSchema,
  } = useFormStore();

  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    setIsLargeScreen(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const searchParams = useSearchParams();
  const rawPurpose = searchParams.get("purpose");
  const purpose = rawPurpose === "create_project_job_form"
    ? "create_project_form"
    : rawPurpose === "edit_project_job_form" || rawPurpose === "edit__project_form"
      ? "edit_project_form"
      : rawPurpose;
  const installationTypeId = searchParams.get("installation_type_id") || undefined;
  const router = useRouter();
  const params = useParams();
  const routeModuleId = params?.id as string;
  const targetModule = routeModuleId || activeModule || "untitled module";
  const resolvedLayoutId =
    layoutId ||
    searchParams.get("layout_id") ||
    searchParams.get("layoutId") ||
    undefined;

  const [moduleName, setModuleName] = useState(
    purpose === "create_layout" || purpose === "create_project_form"
      ? ""
      : purpose === "edit_layout" || purpose === "edit_project_form"
        ? "Loading Layout..."
        : targetModule || "",
  );
  const [moduleNameInvalid, setModuleNameInvalid] = useState(false);

  const [sections, setSections] = useState<Section[]>([
    {
      _uid: `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: "Basic Information",
      column_count: 2,
      fields: [],
      sequence: 1,
    },
  ]);

  const [rules, setRules] = useState<FormRule[]>([]);
  const [editingRule, setEditingRule] = useState<FormRule | null>(null);
  const [deletedRuleIds, setDeletedRuleIds] = useState<{ id: string | number; template_rule_id: string | number | null }[]>([]);

  const [activeTab, setActiveTab] = useState<"form" | "preview" | "rules">("form");
  const [previewLayout, setPreviewLayout] = useState<"desktop" | "phone">("desktop");

  const tabs = [
    { id: "form", label: "Form" },
    { id: "rules", label: "Rules" },
    { id: "preview", label: "Preview" },
  ] as const;

  useEffect(() => {
    clearSchema();
    return () => {
      clearSchema();
    };
  }, [clearSchema, resolvedLayoutId, targetModule, purpose]);

  useEffect(() => {
    const loadSchema = async () => {
      setDeletedRuleIds([]);
      if (
        (purpose === "edit_layout" || purpose === "edit_project_form") &&
        resolvedLayoutId
      ) {
        const handlerCtx = {
          purpose,
          targetModule,
          resolvedLayoutId,
          projectTypeId,
        };
        const data = apiHandlers?.fetchForm
          ? await apiHandlers.fetchForm(resolvedLayoutId, handlerCtx)
          : await getFormSchemaById(resolvedLayoutId, routeModuleId);
        const layoutObj = data?.data || data;
        if (layoutObj?.name) {
          setModuleName(layoutObj.name);
        } else if (layoutObj?.layout?.name) {
          setModuleName(layoutObj.layout.name);
        }
        const schemaData = layoutObj?.sections || layoutObj?.layout?.sections || [];
        let initializedSections: Section[] = [];
        if (apiHandlers?.fetchForm && schemaData.length > 0) {
          initializedSections = [...schemaData]
            .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0))
            .map((sec: any, sIdx: number) => ({
              ...sec,
              _uid: sec.id?.toString() || `section-${sIdx}-${Date.now()}`,
              name: sec.name || sec.sectionHeader || "",
              sequence: sec.sequence ?? sIdx + 1,
              column_count: sec.column_count || sec.columns || 2,
              fields: (sec.fields || [])
                .sort(
                  (a: any, b: any) =>
                    (a.sequence ?? a.order ?? 0) - (b.sequence ?? b.order ?? 0),
                )
                .map((f: any, fIdx: number) => {
                  const validationRules: any = {};
                  if (f.properties?.validation_rules) {
                    Object.keys(f.properties.validation_rules).forEach((key) => {
                      const camelKey = key.replace(/_([a-z])/g, (g) =>
                        g[1].toUpperCase(),
                      );
                      validationRules[camelKey] =
                        f.properties.validation_rules[key];
                    });
                  }

                  const editorType =
                    f.editor_type ??
                    validationRules.editorType ??
                    f.properties?.validation_rules?.editor_type;

                  // f_id fallback: backend may not return f_id, use field id
                  const backendId = f.id != null && !String(f.id).startsWith('field-') ? f.id : null;
                  const fId = f.f_id ?? backendId ?? (f._uid || `field-${fIdx}-${Date.now()}`);

                  return {
                    ...f,
                    _uid: f.id?.toString() || `field-${fIdx}-${Date.now()}`,
                    f_id: fId,
                    order: f.order ?? f.sequence ?? fIdx,
                    original_name: f.api_name || f.name,
                    field_label: f.field_label || f.label || "",
                    api_name: f.api_name || f.name || "",
                    field_type: f.field_type || f.type || "",
                    required:
                      f.required !== undefined
                        ? f.required
                        : f.properties?.is_required || false,
                    is_searchable:
                      f.is_searchable !== undefined
                        ? f.is_searchable
                        : f.properties?.is_searchable || false,
                    is_filterable:
                      f.is_filterable !== undefined
                        ? f.is_filterable
                        : f.properties?.is_filterable || false,
                    is_sortable:
                      f.is_sortable !== undefined
                        ? f.is_sortable
                        : f.properties?.is_sortable || false,
                    is_public:
                      f.is_public !== undefined
                        ? f.is_public
                        : f.properties?.is_public || false,
                    ...(editorType ? { editor_type: editorType } : {}),
                    ...validationRules,
                  };
                }),
            }));
          setSections(initializedSections);
        }
        if (layoutObj?.rules) {
          /** Normalise API condition values to lowercase snake_case so they
           *  match the dropdown option values ("is", "is_not", "is_empty", …).
           *  The API may return "Is", "Is Not", "Is Empty" etc. */
          const normalizeCondition = (c: string): string => {
            if (!c) return c;
            return c.toLowerCase().replace(/\s+/g, '_');
          };
          const loadedRules = (layoutObj.rules || []).map((r: any) => {
            if (r.logic) {
              const ruleData: any = {
                _uid: r.uuid || r._uid || `rule-${Date.now()}-${Math.random()}`,
                name: r.name,
                ...r.logic,
                condition: r.logic.condition ? normalizeCondition(r.logic.condition) : undefined,
                id: r.id ?? r.logic.id,
                template_rule_id: r.template_rule_id ?? r.template_rule ?? null,
              };
              if (r.logic.blocks) {
                ruleData.blocks = r.logic.blocks.map((b: any) => ({
                  ...b,
                  condition: normalizeCondition(b.condition),
                }));
              }
              return ruleData;
            }
            const ruleData: any = {
              ...r,
              _uid: r.uuid || r._uid || `rule-${Date.now()}-${Math.random()}`,
              condition: r.condition ? normalizeCondition(r.condition) : undefined,
              template_rule_id: r.template_rule_id ?? r.template_rule ?? null,
            };
            if (r.blocks) {
              ruleData.blocks = r.blocks.map((b: any) => ({
                ...b,
                condition: normalizeCondition(b.condition),
              }));
            }
            return ruleData;
          });

          /** Re-resolve each rule block or output target against current loaded fields and sections.
           *  For sections:
           *    Priority: 1) direct match  2) s_id / section_id / section_uid / raw ID  3) section_name / api_name  4) sequence
           *  For fields:
           *    Priority: 1) direct match  2) f_id / field_id  3) api_name fallback */
          const normalizeRuleTarget = (
            target: string | undefined,
            targetType: string | undefined,
            apiName: string | null | undefined,
            sectionName: string | null | undefined,
            fId: any,
            fieldId: any,
            sId: any,
            sectionId: any,
            sectionUid: any,
            allSections: Section[],
          ): string | undefined => {
            if (!target) return target;

            const isSection =
              targetType === "section" ||
              String(target).startsWith(SECTION_RULE_TARGET_PREFIX) ||
              (!fId && !fieldId && (sId != null || sectionId != null || sectionUid != null));

            if (isSection) {
              const canonicalForSection = (s: Section, sIdx: number): string => {
                if (s.id != null && !String(s.id).startsWith("section-")) {
                  return `${SECTION_RULE_TARGET_PREFIX}${s.id}`;
                }
                return `${SECTION_RULE_TARGET_PREFIX}${s.s_id ?? s._uid ?? (s.sequence ?? sIdx + 1)}`;
              };

              // 1. Direct match
              if (allSections.some((s, sIdx) => canonicalForSection(s, sIdx) === target)) {
                return target;
              }

              // 2. Priority match by s_id / section_id / section_uid / raw ID in target string
              const rawTargetId = String(target).replace(SECTION_RULE_TARGET_PREFIX, "");
              const candidateIds = [sId, sectionId, sectionUid, rawTargetId].filter(
                (id) => id != null && id !== ""
              );

              const byId = allSections.find((s) =>
                candidateIds.some(
                  (cid) =>
                    String(s.s_id) === String(cid) ||
                    String(s.id) === String(cid) ||
                    String(s._uid) === String(cid)
                )
              );
              if (byId) {
                const sIdx = allSections.indexOf(byId);
                return canonicalForSection(byId, sIdx);
              }

              // 3. Fallback match by section_name or api_name
              const nameToMatch = sectionName || apiName;
              if (nameToMatch) {
                const byName = allSections.find(
                  (s) => s.name?.trim().toLowerCase() === String(nameToMatch).trim().toLowerCase()
                );
                if (byName) {
                  const sIdx = allSections.indexOf(byName);
                  return canonicalForSection(byName, sIdx);
                }
              }

              // 4. Fallback match by sequence if raw target ID is a sequence number
              const numSeq = Number(rawTargetId);
              if (!isNaN(numSeq) && numSeq > 0) {
                const bySeq = allSections.find((s, idx) => (s.sequence ?? idx + 1) === numSeq);
                if (bySeq) {
                  const sIdx = allSections.indexOf(bySeq);
                  return canonicalForSection(bySeq, sIdx);
                }
              }

              return target;
            }

            // --- Field normalization ---
            const allFields: any[] = [];
            allSections.forEach((sec) => {
              (sec.fields || []).forEach((f) => allFields.push(f));
            });

            const canonicalForField = (f: any): string => {
              if (f.id != null && !String(f.id).startsWith("field-")) {
                return `${FIELD_RULE_TARGET_PREFIX}${f.id}`;
              }
              return `${FIELD_RULE_TARGET_PREFIX}${f.f_id ?? f._uid}`;
            };

            // 1. Direct match
            if (allFields.some((f) => canonicalForField(f) === target)) return target;

            // 2. Priority match by f_id / field_id
            const rawId = fId ?? fieldId;
            if (rawId != null && rawId !== "") {
              const byFId = allFields.find(
                (f) =>
                  String(f.f_id) === String(rawId) ||
                  String(f.id) === String(rawId) ||
                  String(f._uid) === String(rawId)
              );
              if (byFId) return canonicalForField(byFId);
            }

            // 3. Fallback match by api_name
            if (apiName) {
              const byApiName = allFields.find((f) => f.api_name === apiName);
              if (byApiName) return canonicalForField(byApiName);
            }

            return target;
          };

          const normalizeOutput = (o: any): any => ({
            ...o,
            field_api_name: normalizeRuleTarget(
              o.field_api_name,
              o.target_type,
              o.api_name,
              o.section_name,
              o.f_id,
              o.field_id,
              o.s_id,
              o.section_id,
              o.section_uid,
              initializedSections,
            ),
          });

          const normalizeBlock = (b: any): any => ({
            ...b,
            field_api_name: normalizeRuleTarget(
              b.field_api_name,
              "field",
              b.api_name,
              b.section_name,
              b.f_id,
              b.field_id,
              b.s_id,
              undefined,
              undefined,
              initializedSections,
            ),
            output_fields: (b.output_fields || []).map(normalizeOutput),
            else_blocks: (b.else_blocks || []).map((eb: any) => ({
              ...eb,
              else_output_fields: (eb.else_output_fields || []).map(normalizeOutput),
            })),
            else_output_fields: (b.else_output_fields || []).map(normalizeOutput),
          });

          const normalizedRules = loadedRules.map((r: any) => ({
            ...r,
            field_api_name: r.field_api_name
              ? normalizeRuleTarget(
                  r.field_api_name,
                  "field",
                  r.api_name,
                  r.section_name,
                  r.f_id,
                  r.field_id,
                  r.s_id,
                  undefined,
                  undefined,
                  initializedSections,
                )
              : r.field_api_name,
            output_fields: (r.output_fields || []).map(normalizeOutput),
            blocks: (r.blocks || []).map(normalizeBlock),
          }));

          setRules(normalizedRules);
        }
      } else if (
        purpose !== "create_module" &&
        purpose !== "create_layout" &&
        purpose !== "edit_layout" &&
        purpose !== "edit_project_form" &&
        purpose !== "create_project_form"
      ) {
        const data = await getFormSchema(targetModule);
        const layoutObj = data?.data || data;
        if (layoutObj?.name) {
          setModuleName(layoutObj.name);
        }
        if (layoutObj?.rules) {
          const normalizeCondition = (c: string): string => {
            if (!c) return c;
            return c.toLowerCase().replace(/\s+/g, '_');
          };
          const loadedRules = (layoutObj.rules || []).map((r: any) => {
            if (r.logic) {
              const ruleData: any = {
                _uid: r.uuid || r._uid || `rule-${Date.now()}-${Math.random()}`,
                name: r.name,
                ...r.logic,
                condition: r.logic.condition ? normalizeCondition(r.logic.condition) : undefined,
                id: r.id ?? r.logic.id,
                template_rule_id: r.template_rule_id ?? r.template_rule ?? null,
              };
              if (r.logic.blocks) {
                ruleData.blocks = r.logic.blocks.map((b: any) => ({
                  ...b,
                  condition: normalizeCondition(b.condition),
                }));
              }
              return ruleData;
            }
            const ruleData: any = {
              ...r,
              _uid: r.uuid || r._uid || `rule-${Date.now()}-${Math.random()}`,
              condition: r.condition ? normalizeCondition(r.condition) : undefined,
              template_rule_id: r.template_rule_id ?? r.template_rule ?? null,
            };
            if (r.blocks) {
              ruleData.blocks = r.blocks.map((b: any) => ({
                ...b,
                condition: normalizeCondition(b.condition),
              }));
            }
            return ruleData;
          });
          setRules(loadedRules);
        }
      }
    };
    loadSchema();
  }, [
    apiHandlers,
    getFormSchema,
    getFormSchemaById,
    projectTypeId,
    resolvedLayoutId,
    routeModuleId,
    targetModule,
    purpose,
  ]);

  useEffect(() => {
    if (formSchema && formSchema.length > 0) {
      const sortedSchema = [...formSchema].sort(
        (a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0),
      );
      const initializedSections: Section[] = sortedSchema.map(
        (sec: any, sIdx: number) => ({
          ...sec,
          _uid: sec.id?.toString() || `section-${sIdx}-${Date.now()}`,
          name: sec.name || sec.sectionHeader || "",
          sequence: sec.sequence ?? sIdx + 1,
          column_count: sec.column_count || sec.columns || 2,
          fields: (sec.fields || sec.fields || [])
            .sort(
              (a: any, b: any) =>
                (a.sequence ?? a.order ?? 0) - (b.sequence ?? b.order ?? 0),
            )
            .map((f: any, fIdx: number) => {
              const validationRules: any = {};
              if (f.properties?.validation_rules) {
                Object.keys(f.properties.validation_rules).forEach((key) => {
                  const camelKey = key.replace(/_([a-z])/g, (g) =>
                    g[1].toUpperCase(),
                  );
                  validationRules[camelKey] =
                    f.properties.validation_rules[key];
                });
              }

              const editorType =
                f.editor_type ??
                validationRules.editorType ??
                f.properties?.validation_rules?.editor_type;

              const fieldId = f.id != null && !String(f.id).startsWith("field-") ? f.id : null;
              const fId = f.f_id ?? fieldId ?? (f._uid || `field-${fIdx}-${Date.now()}`);

              return {
                ...f,
                _uid: f.id?.toString() || f._uid || `field-${fIdx}-${Date.now()}`,
                f_id: fId,
                order: f.order ?? f.sequence ?? fIdx,
                original_name: f.api_name || f.name,
                field_label: f.field_label || f.label || "",
                api_name: f.api_name || f.name || "",
                field_type: f.field_type || f.type || "",
                required:
                  f.required !== undefined
                    ? f.required
                    : f.properties?.is_required || false,
                is_searchable:
                  f.is_searchable !== undefined
                    ? f.is_searchable
                    : f.properties?.is_searchable || false,
                is_filterable:
                  f.is_filterable !== undefined
                    ? f.is_filterable
                    : f.properties?.is_filterable || false,
                is_sortable:
                  f.is_sortable !== undefined
                    ? f.is_sortable
                    : f.properties?.is_sortable || false,
                is_public:
                  f.is_public !== undefined
                    ? f.is_public
                    : f.properties?.is_public || false,
                ...(editorType ? { editor_type: editorType } : {}),
                ...validationRules,
              };
            }),
        }),
      );
      setSections(initializedSections);
    } else if (purpose === "create_module" || purpose === "create_layout" || purpose === "create_project_form") {
      setSections([
        {
          _uid: `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: "Basic Information",
          column_count: 2,
          fields: [],
          sequence: 1,
        },
      ]);
    }
  }, [formSchema, targetModule, purpose]);

  const [showModal, setShowModal] = useState<any>(null);
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [showRuleTypeModal, setShowRuleTypeModal] = useState<boolean>(false);
  const [showAdvancedRuleModal, setShowAdvancedRuleModal] = useState<boolean>(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  const hasPersistedId = (id: string | number | undefined) =>
    id != null &&
    id !== "" &&
    !String(id).startsWith("section-") &&
    !String(id).startsWith("field-");

  const getSectionRuleTarget = (section: Section) =>
    `${SECTION_RULE_TARGET_PREFIX}${hasPersistedId(section.id) ? section.id : section._uid}`;

  const getFieldRuleTarget = (field: Field) =>
    `${FIELD_RULE_TARGET_PREFIX}${hasPersistedId(field.id) ? field.id : (field.f_id ?? field._uid)}`;

  const ruleFieldOptions: RuleFieldOption[] = sections
    .filter((section) => !section.is_deleted)
    .flatMap((section) => {
      const sectionLabel = section.name || "Untitled Section";
      const sectionKey = String(hasPersistedId(section.id) ? section.id : section._uid);
      const sectionOption: RuleFieldOption = {
        value: getSectionRuleTarget(section),
        label: `${sectionLabel} (Section)`,
        type: "section",
        targetType: "section",
        sectionId: hasPersistedId(section.id) ? section.id! : null,
        sectionUid: section._uid,
        s_id: section.s_id ?? (hasPersistedId(section.id) ? section.id : section._uid),
        sectionKey,
        sectionLabel,
        apiName: sectionLabel,
        optionKind: "section",
      };
      const fieldOptions: RuleFieldOption[] = (section.fields || [])
        .filter((field) => !field.is_deleted && field.api_name)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((field) => {
          const fId = field.f_id ?? (hasPersistedId(field.id) ? field.id : field._uid);
          return {
            value: getFieldRuleTarget(field),
            label: field.field_label || field.api_name || "Untitled Field",
            type: field.field_type,
            options: field.options,
            apiName: field.api_name,
            targetType: "field" as const,
            fieldId: hasPersistedId(field.id) ? field.id! : null,
            f_id: fId,
            fieldUid: field._uid,
            u_id: field.u_id ?? field._uid,
            s_id: field.s_id ?? section.s_id ?? (hasPersistedId(section.id) ? section.id : section._uid),
            sectionKey,
            sectionLabel,
            optionKind: "field",
          };
        });

      return [sectionOption, ...fieldOptions];
    });

  const addFieldToSection = (sectionUid: string, fieldConfig: any) => {
    if (!sectionUid) return;
    setSections((prev) => {
      // Generate unique api_name if duplicate found
      const uniqueApiName = getUniqueApiName(fieldConfig.api_name, prev);
      const newFieldUid = fieldConfig._uid || `${Date.now()}`;
      const fId = fieldConfig.f_id ?? (hasPersistedId(fieldConfig.id) ? fieldConfig.id : newFieldUid);

      return prev.map((sec) =>
        sec._uid === sectionUid
          ? {
            ...sec,
            fields: [
              ...sec.fields,
              {
                _uid: newFieldUid,
                f_id: fId,
                order: sec.fields.length,
                ...fieldConfig,
                api_name: uniqueApiName, // Use unique api_name
              },
            ],
          }
          : sec,
      );
    });
    setShowModal(null);
    setDirty(true);
  };

  const updateFieldInSection = (
    sectionUid: string,
    fieldUid: string,
    newConfig: any,
  ) => {
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

  const addNewSectionAfter = (
    afterUid: string | null = null,
    isSubform = false,
  ) => {
    const newSection: Section = {
      _uid: `section-${Date.now()}`,
      name: "",
      column_count: isSubform ? 1 : 2,
      is_subform: isSubform,
      fields: [],
    };
    setSections((prev) => {
      let next: Section[];
      if (afterUid === "__TOP__") next = [newSection, ...prev];
      else if (!afterUid) next = [...prev, newSection];
      else {
        const index = prev.findIndex((s) => s._uid === afterUid);
        const copy = [...prev];
        copy.splice(index + 1, 0, newSection);
        next = copy;
      }
      return reindexSectionSequences(next);
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
      prev.map((s) => (s._uid === editingSectionId ? { ...s, name } : s)),
    );
    setEditingSectionId(null);
    setTempName("");
    setDirty(true);
  };

  const deleteSection = (sectionUid: string) => {
    setSections((prev) =>
      reindexSectionSequences(
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
    if (!moduleName.trim()) {
      setModuleNameInvalid(true);
      return;
    }
    setModuleNameInvalid(false);

    try {
      setSaving(true);
      const isNew = !formSchema || formSchema.length === 0;
      let savedFormId: string | number | undefined = undefined;

      const formatFieldPayload = (f: any, fIdx: number) => {
        const fieldPayload: any = {
          field_label: f.field_label,
          api_name: f.api_name,
          field_type: f.field_type,
          sequence: fIdx + 1,
          ...(f.f_id != null ? { f_id: f.f_id } : {}),
          ...(f.s_id != null ? { s_id: f.s_id } : {}),
        };

        if (f.is_custom !== undefined) {
          fieldPayload.is_custom = f.is_custom;
        }

        if (f.placeholder) fieldPayload.placeholder = f.placeholder;
        if (f.helpText) fieldPayload.help_text = f.helpText;
        if (f.options && f.options.length > 0) fieldPayload.options = f.options;

        const validationRules: any = {};
        const excludeKeys = [
          "id",
          "_uid",
          "u_id",
          "s_id",
          "f_id",
          "field_label",
          "api_name",
          "field_type",
          "order",
          "original_name",
          "is_deleted",
          "is_active",
          "placeholder",
          "helpText",
          "options",
          "required",
          "is_searchable",
          "is_filterable",
          "is_sortable",
          "is_public",
          "markAsPublic",
          "show_tooltip",
          "tool_tip",
          "properties",
        ];

        Object.keys(f).forEach((key) => {
          if (!excludeKeys.includes(key)) {
            const snakeKey = key.replace(
              /[A-Z]/g,
              (letter) => `_${letter.toLowerCase()}`,
            );
            validationRules[snakeKey] = f[key];
          }
        });

        fieldPayload.properties = {
          is_required: f.required || false,
          is_public: f.is_public || false,
          validation_rules: validationRules,
        };

        if (f.properties?.id) {
          fieldPayload.properties.id = f.properties.id;
        }

        return fieldPayload;
      };

      const formatRulesPayload = (rulesList: FormRule[]) => {
        return rulesList.map((r, i) => {
          const ruleId = r.id ?? r.rule_id;
          return {
            ...(ruleId != null && ruleId !== "" ? { id: ruleId } : {}),
            name: r.name,
            ...(r.s_id != null ? { s_id: r.s_id } : {}),
            logic: {
              sequence: i + 1,
              field_api_name: r.field_api_name,
              field_id: r.field_id ?? r.f_id,
              f_id: r.f_id ?? r.field_id,
              field_uid: r.field_uid,
              ...(r.s_id != null ? { s_id: r.s_id } : {}),
              condition: r.condition,
              value: r.value,
              output_fields: (r.output_fields || []).map((o) => {
                const { u_id, ...cleanO } = o as any;
                return {
                  ...cleanO,
                  ...(o.s_id != null ? { s_id: o.s_id } : {}),
                };
              }),
              rule_type: r.rule_type || "normal",
              ...(r.rule_type === "advanced"
                ? {
                  blocks: (r.blocks || []).map((b) => {
                    const { u_id, ...cleanB } = b as any;
                    return {
                      ...cleanB,
                      ...(b.s_id != null ? { s_id: b.s_id } : {}),
                      output_fields: (b.output_fields || []).map((o) => {
                        const { u_id, ...cleanO } = o as any;
                        return {
                          ...cleanO,
                          field_id: o.field_id ?? o.f_id ?? null,
                          f_id: o.f_id ?? o.field_id ?? null,
                          ...(o.s_id != null ? { s_id: o.s_id } : {}),
                        };
                      }),
                      ...(b.else_blocks
                        ? {
                          else_blocks: b.else_blocks.map((eb) => ({
                            ...eb,
                            else_output_fields: (eb.else_output_fields || []).map((o) => {
                              const { u_id, ...cleanO } = o as any;
                              return {
                                ...cleanO,
                                field_id: o.field_id ?? o.f_id ?? null,
                                f_id: o.f_id ?? o.field_id ?? null,
                                ...(o.s_id != null ? { s_id: o.s_id } : {}),
                              };
                            }),
                          })),
                        }
                        : {}),
                    };
                  }),
                }
                : {}),
            },
          };
        });
      };

      let finalPayload: any;

      if (purpose === "edit_layout" || purpose === "edit_project_form") {
        const allNonDeletedSections = sections.filter((sec) => !sec.is_deleted);

        const createdSections = allNonDeletedSections
          .filter((sec) => !sec.id || String(sec.id).startsWith("section-"))
          .map((sec) => {
            const activeFields = (sec.fields || []).filter(
              (f) => !f.is_deleted,
            );
            const sequencePosition = allNonDeletedSections.indexOf(sec) + 1;
            return {
              s_id: sec.s_id ?? (hasPersistedId(sec.id) ? sec.id : sec._uid),
              name: sec.name,
              sequence: sequencePosition,
              column_count: sec.column_count,
              is_subform: !!sec.is_subform,
              fields: activeFields.map((f, fIdx) =>
                formatFieldPayload(f, fIdx),
              ),
            };
          });

        const updatedSections = allNonDeletedSections
          .filter((sec) => sec.id && !String(sec.id).startsWith("section-"))
          .map((sec) => {
            const activeFields = (sec.fields || [])
              .filter((f) => !f.is_deleted)
              .map((f, fIdx) => {
                const payload = formatFieldPayload(f, fIdx);
                if (f.id && !String(f.id).startsWith("field-")) {
                  payload.id = Number(f.id) || f.id;
                }
                return payload;
              });

            const sequencePosition = allNonDeletedSections.indexOf(sec) + 1;
            return {
              id: Number(sec.id) || sec.id,
              s_id: sec.s_id ?? (hasPersistedId(sec.id) ? sec.id : sec._uid),
              name: sec.name,
              sequence: sequencePosition,
              column_count: sec.column_count,
              is_subform: !!sec.is_subform,
              is_custom: sec.is_custom,
              fields: activeFields,
            };
          });

        const deletedSections = sections
          .filter(
            (sec) =>
              sec.is_deleted &&
              sec.id &&
              !String(sec.id).startsWith("section-"),
          )
          .map((sec) => {
            return {
              id: Number(sec.id) || sec.id,
              is_custom: sec.is_custom,
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

        if (purpose === "edit_project_form") {
          finalPayload = {
            name: moduleName,
            api_name: moduleName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            description: "",
            is_active: true,
            sections: {
              create: createdSections,
              update: updatedSections,
              delete: finalDeletePayload,
            },
            rules: formatRulesPayload(rules),
          };
        } else {
          finalPayload = {
            layout: {
              id: Number(resolvedLayoutId) || resolvedLayoutId,
              name: moduleName,
              description: "",
              sequence: 1,
              is_active: false,
            },
            name: moduleName,
            create: createdSections,
            update: updatedSections,
            delete: finalDeletePayload,
            rules: formatRulesPayload(rules),
          };
        }
      } else {
        const sectionsPayload = sections
          .filter((sec) => !sec.is_deleted)
          .map((sec: any, secIdx: number) => {
            const secPayload: any = {
              s_id: sec.s_id ?? (hasPersistedId(sec.id) ? sec.id : sec._uid),
              name: sec.name,
              sequence: secIdx + 1,
              column_count: sec.column_count,
              is_subform: !!sec.is_subform,
            };

            if (sec.id && !String(sec.id).startsWith("section-")) {
              secPayload.id = Number(sec.id) || sec.id;
            }

            const activeFields = (sec.fields || []).filter(
              (f: any) => !f.is_deleted,
            );
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
            rules: formatRulesPayload(rules),
          };
        } else if (purpose === "create_project_form") {
          finalPayload = {
            name: moduleName,
            api_name: moduleName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            description: "",
            is_active: true,
            sections: sectionsPayload,
            rules: formatRulesPayload(rules),
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
            rules: formatRulesPayload(rules),
          };
        }
      }

      if (
        (purpose === "create_project_form" || purpose === "edit_project_form") &&
        apiHandlers
      ) {
        const handlerCtx = {
          purpose,
          rawPurpose,
          targetModule,
          resolvedLayoutId,
          projectTypeId,
          installationTypeId,
        };

        const createdForm =
          purpose === "create_project_form"
            ? await apiHandlers.createForm(finalPayload, handlerCtx)
            : null;
        const formId =
          purpose === "edit_project_form"
            ? resolvedLayoutId
            : getCreatedFormId(createdForm);
        savedFormId = formId;

        if (purpose === "create_project_form" && !formId) {
          throw new Error("Form creation response did not include form_id.");
        }

        if (
          purpose === "edit_project_form" &&
          formId &&
          apiHandlers.updateForm
        ) {
          if (deletedRuleIds.length > 0 && rawPurpose === "edit_project_job_form") {
            await api.post(`project-forms/${formId}/rules/mass-delete/`, {
              rule_ids: deletedRuleIds.map((entry) => entry.id),
            });
          }
          await apiHandlers.updateForm(formId, finalPayload, handlerCtx);
        }

        if (formId && apiHandlers.createSections) {
          await apiHandlers.createSections(
            formId,
            finalPayload.sections || [],
            handlerCtx,
          );
        }

        if (formId && apiHandlers.createRules) {
          await apiHandlers.createRules(
            formId,
            formatRulesPayload(rules),
            handlerCtx,
          );
        }
      } else if (purpose === "create_module") {
        await createModule(finalPayload);
      } else if (purpose === "create_layout") {
        await createForm(targetModule, finalPayload, purpose);
      } else {
        if (purpose === "edit_layout" && resolvedLayoutId) {
          await editForm(
            resolvedLayoutId,
            finalPayload,
            routeModuleId,
            purpose,
          );
        } else if (isNew) {
          await createForm(targetModule, finalPayload, purpose);
        } else if (resolvedLayoutId) {
          await editForm(
            resolvedLayoutId,
            finalPayload,
            routeModuleId,
            purpose,
          );
        }
      }

      setDirty(false);
      setDeletedRuleIds([]);

      let successMessage = t("layoutSavedToast");
      if (purpose === "create_module") {
        successMessage = t("moduleCreatedToast");
      } else if (purpose === "create_project_form") {
        successMessage = "Project form created successfully.";
      } else if (purpose === "edit_project_form") {
        successMessage = "Project form updated successfully.";
      } else if (purpose === "create_layout" || isNew) {
        successMessage = t("layoutCreatedToast");
      } else if (purpose === "edit_layout") {
        successMessage = t("layoutUpdatedToast");
      }

      toastSuccess(successMessage);

      if (purpose === "create_project_form" && savedFormId && !isClose) {
        router.push(
          `${routes.dashboard.settingsProjectForms}/create?purpose=edit_project_form&layout_id=${savedFormId}`,
        );
      } else if (isClose) {
        if (purpose === "create_module") {
          router.push(routes.dashboard.settingsModules);
        } else if (purpose === "create_project_form") {
          router.back();
        } else if (purpose === "create_layout" || purpose === "edit_layout") {
          router.push(`${routes.dashboard.settingsModules}/${targetModule}/layout`);
        } else {
          router.back();
        }
      }
    } catch (err) {
      console.error("Save failed", err);
      toastApiError(err);
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

  const moveField = (
    sectionUid: string,
    fromUid: string,
    toFilteredIndex: number,
  ) => {
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
  const sidebarW = sidebarOpen ? 200 : 42;
  const canvasMarginLeft = 288;

  // Keep CSS variables in sync with sidebar width so fixed sub-header and
  // ModuleBar left-position animate purely via CSS (no React render delay).
  React.useLayoutEffect(() => {
    if (isLargeScreen) {
      document.documentElement.style.setProperty("--subheader-sidebar-w", `${sidebarW}px`);
    }
  }, [sidebarW, isLargeScreen]);

  const {
    formRef,
    isLoading: isSubmitting,
    handleSubmit: handleFormSubmit,
  } = useFormHandler<any, FormRendererRef>(async (data) => {
    console.log("📋 Form Payload:", data);
  });

  const handleSaveRule = (rule: FormRule) => {
    setRules((prev) => {
      const exists = prev.find((r) => r._uid === rule._uid);
      if (exists) {
        return prev.map((r) => (r._uid === rule._uid ? rule : r));
      }
      return [...prev, rule];
    });
    setShowRuleModal(false);
    setShowAdvancedRuleModal(false);
    setEditingRule(null);
    setDirty(true);
  };

  const handleDeleteRule = (uid: string) => {
    const ruleToDelete = rules.find((r) => r._uid === uid);
    if (ruleToDelete) {
      const ruleId = ruleToDelete.id ?? ruleToDelete.rule_id;
      const templateRuleId = (ruleToDelete as any).template_rule_id;
      const hasValidId = ruleId != null && ruleId !== "";
      const hasTemplateId = templateRuleId != null && templateRuleId !== "";

      if (hasValidId || hasTemplateId) {
        setDeletedRuleIds((prev) => {
          const isDuplicate = prev.some(
            (entry) =>
              (hasValidId && entry.id === ruleId) ||
              (hasTemplateId && entry.template_rule_id === templateRuleId),
          );
          if (!isDuplicate) {
            const newEntry: { id: string | number; template_rule_id: string | number | null } = {
              id: hasValidId && ruleId != null ? ruleId : "",
              template_rule_id: templateRuleId ?? null,
            };
            return [...prev, newEntry];
          }
          return prev;
        });
      }
    }
    setRules((prev) => prev.filter((r) => r._uid !== uid));
    setDirty(true);
  };

  return (

    <div className="relative flex flex-col h-full -mx-4 -mt-5 lg:mx-0 lg:mt-0">
      {/*
        showRuleTypeModal && (
          <RuleTypeModal
            isOpen={showRuleTypeModal}
            onClose={() => setShowRuleTypeModal(false)}
            onSelect={(type) => {
              setShowRuleTypeModal(false);
              setEditingRule(null);
              if (type === "advanced") {
                setShowAdvancedRuleModal(true);
              } else {
                setShowRuleModal(true);
              }
            }}
          />
        )
      */}
      {
        showRuleModal && (
          <FormRuleModal
            initialRule={editingRule}
            onSave={handleSaveRule}
            onClose={() => {
              setShowRuleModal(false);
              setEditingRule(null);
            }}
            fields={ruleFieldOptions}
            existingRules={rules}
          />
        )
      }
      {
        showAdvancedRuleModal && (
          <FormAdvancedRuleModal
            initialRule={editingRule}
            onSave={handleSaveRule}
            onClose={() => {
              setShowAdvancedRuleModal(false);
              setEditingRule(null);
            }}
            fields={ruleFieldOptions}
            existingRules={rules}
          />
        )
      }
      {/* Responsive Sub-header */}
      <div
        className={`z-20 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${isLargeScreen
            ? "fixed top-14 flex items-center justify-between h-14 px-6"
            : "relative w-full flex flex-col gap-4 p-4"
          }`}
        style={
          isLargeScreen
            ? {
              left: "var(--subheader-sidebar-w, 200px)",
              width: "calc(100% - var(--subheader-sidebar-w, 200px))",
              transition: "left 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1)",
            }
            : undefined
        }
      >
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full opacity-80" />
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <label htmlFor="form-builder-name" className="sr-only">
              {t("nameLabel")}
            </label>
            <input
              id="form-builder-name"
              value={moduleName}
              onChange={(e) => {
                const next = e.target.value;
                setModuleName(next);
                setDirty(true);
                if (moduleNameInvalid && next.trim()) {
                  setModuleNameInvalid(false);
                }
              }}
              aria-invalid={moduleNameInvalid || undefined}
              aria-required="true"
              className={cn(
                "min-w-[12rem] max-w-[16rem] rounded-md border bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 outline-none transition",
                "placeholder:font-normal placeholder:text-slate-400",
                "focus:ring-2 focus:ring-[color:var(--dash-accent,#111111)]/20",
                "dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
                moduleNameInvalid
                  ? "border-red-500 focus:border-red-500 dark:border-red-500"
                  : "border-slate-200 hover:border-slate-300 focus:border-[color:var(--dash-accent,#111111)] dark:border-slate-700 dark:hover:border-slate-600",
              )}
              placeholder={t("namePlaceholder")}
            />
            <span className={fieldRequiredMarkClassName} aria-hidden>
              *
            </span>
          </div>
        </div>

        <div className="flex justify-center w-full lg:w-auto lg:flex-1">
          <AppTabs
            tabs={tabs}
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "form" | "preview" | "rules")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <Button variant="secondary" onClick={() => router.push(BackUrl)} className="flex-1 lg:flex-initial justify-center">
            Close
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSave(true)}
            disabled={!dirty || saving}
            className="flex-1 lg:flex-initial justify-center"
          >
            Save and Close
          </Button>
          <Button
            onClick={() => handleSave(false)}
            disabled={!dirty || saving}
            className="flex-1 lg:flex-initial justify-center"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <ModuleBar />

      {/* Main builder canvas offset past sidebar + ModuleBar */}
      <div
        className="px-2 py-4 lg:p-6 transition-all duration-300 pt-4 lg:pt-10"
        style={isLargeScreen ? { marginLeft: canvasMarginLeft } : { marginLeft: 0 }}
      >

        <div className="mx-auto">
          {activeTab === "form" && (
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
                    setSections={setSections}
                    setDirty={setDirty}
                    addNewSectionAfter={addNewSectionAfter}
                    deleteSection={deleteSection}
                    handleColumnChange={handleColumnChange}
                    deleteField={deleteField}
                    moveField={moveField}
                  />
                ))}
            </div>
          )}

          {activeTab === "preview" && (
            <div className="w-full">
              <div className="mb-3 flex items-center justify-end">
                <div className="inline-flex rounded-md border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    className={`flex h-9 items-center gap-2 rounded px-3 text-sm transition ${previewLayout === "desktop"
                      ? "bg-[color:var(--dash-accent,#111111)] text-[color:var(--dash-on-accent,#ffffff)]"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    onClick={() => setPreviewLayout("desktop")}
                  >
                    <Monitor className="size-4" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    className={`flex h-9 items-center gap-2 rounded px-3 text-sm transition ${previewLayout === "phone"
                      ? "bg-[color:var(--dash-accent,#111111)] text-[color:var(--dash-on-accent,#ffffff)]"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    onClick={() => setPreviewLayout("phone")}
                  >
                    <Smartphone className="size-4" />
                    Phone
                  </button>
                </div>
              </div>
              <div className="flex w-full justify-center">
                <div
                  className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm ${previewLayout === "phone"
                      ? "rounded-sm p-2 sm:p-4"
                      : "w-full rounded-sm p-3 sm:p-8"
                    }`}
                  style={
                    previewLayout === "phone"
                      ? { width: 390, maxWidth: "100%" }
                      : undefined
                  }
                >
                  <FormRenderer
                    key={previewLayout}
                    ref={formRef}
                    schema={reindexSectionSequences(
                      sections.filter((s) => !s.is_deleted),
                    )}
                    rules={rules}
                    renderMode={previewLayout}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleFormSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Form"}
                </Button>
              </div>
            </div>
          )}
          {activeTab === "rules" && (
            <div className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-sm">
              <div className="border-b border-gray-300 dark:border-slate-600 p-3 flex items-center justify-between">
                <span className="font-medium text-slate-900 dark:text-slate-300">Field Rules</span>
                <AppButton
                  onClick={() => {
                    setEditingRule(null);
                    setShowAdvancedRuleModal(true);
                  }}
                >
                  Add Rule
                </AppButton>
              </div>
              <div className="p-4">
                {rules.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No rules defined yet. Click "Add Rule" to create one.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {rules.map((rule, idx) => (
                      <div key={rule._uid} className="flex items-start justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-md hover:shadow-sm transition-shadow">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">{rule.name}</h4>
                            {rule.rule_type === "advanced" && (
                              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded">
                                Advanced
                              </span>
                            )}
                          </div>
                          {rule.rule_type === "advanced" && rule.blocks ? (
                            <div className="space-y-2 mt-1 pl-3 border-l-2 border-purple-500/50">
                              {rule.blocks.map((block, bIdx) => (
                                <p key={block._uid} className="text-sm text-slate-500 dark:text-slate-400">
                                  <strong className="text-xs text-slate-400">Block #{bIdx + 1}:</strong>
                                  <br />
                                  <strong>If</strong> {ruleFieldOptions.find(f => f.value === block.field_api_name)?.label || block.field_api_name} {block.condition.replace(/_/g, ' ')} {block.value ? (Array.isArray(block.value) ? block.value.join(', ') : block.value) : ''}
                                  <br />
                                  <strong>Then</strong> {block.output_fields.length} action(s) applied.
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              <strong>If</strong> {ruleFieldOptions.find(f => f.value === rule.field_api_name)?.label || rule.field_api_name} {rule.condition?.replace(/_/g, ' ') || ''} {rule.value ? (Array.isArray(rule.value) ? rule.value.join(', ') : rule.value) : ''}
                              <br />
                              <strong>Then</strong> {rule.output_fields?.length || 0} action(s) applied.
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <AppButton
                            variant="ghost"
                            size="sm"
                            className="p-2"
                            onClick={() => {
                              setEditingRule(rule);
                              if (rule.rule_type === "advanced") {
                                setShowAdvancedRuleModal(true);
                              } else {
                                setShowRuleModal(true);
                              }
                            }}
                          >
                            <Edit2 className="size-4" />
                          </AppButton>
                          <AppButton
                            variant="ghost"
                            size="sm"
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => handleDeleteRule(rule._uid)}
                          >
                            <Trash2 className="size-4" />
                          </AppButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
            setShowModal(null);
          }}
          onClose={() => setShowModal(null)}
        />
      )}
    </div>
  );
}
