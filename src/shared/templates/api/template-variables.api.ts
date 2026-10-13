import api from "@/core/api/axios";

export interface VariableItem {
  key: string;
  label: string;
  tag: string;
  category: string;
  categoryLabel: string;
  parentModule: string;
  isRelated?: boolean;
  description?: string;
}

export interface ModuleVariablesData {
  moduleName: string;
  primaryKeys: VariableItem[];
  relatedModules: Record<string, VariableItem[]>;
  allVariables: VariableItem[];
}

export function formatFieldLabel(key: string): string {
  if (!key) return "";
  return key
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatModuleDisplayName(name: string): string {
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  if (lower === "quotations" || lower === "quotation") return "Quotation";
  if (lower === "orders" || lower === "order") return "Orders";
  return formatFieldLabel(lower);
}

function buildTag(moduleName: string, fieldKey: string, isRelated: boolean): string {
  const cleanField = fieldKey.trim().replace(/^<|>$/g, "").replace(/\s+/g, "_").toLowerCase();
  if (isRelated) {
    const cleanMod = moduleName.trim().replace(/\s+/g, "_").toLowerCase();
    return `<${cleanMod}.${cleanField}>`;
  }
  return `<${cleanField}>`;
}

/**
 * Normalizes backend response from `listmodules?module_name=quotations` (or orders)
 * Handles:
 * {
 *   "Module": "quotations",
 *   "Module_Keys": ["comment", "created_at", ...],
 *   "Related_Modules": {
 *     "sections": ["block", "name", ...],
 *     "sites": [...]
 *   }
 * }
 */
export function parseModuleVariables(raw: unknown, defaultModuleName = "quotations"): ModuleVariablesData {
  const empty: ModuleVariablesData = {
    moduleName: defaultModuleName,
    primaryKeys: [],
    relatedModules: {},
    allVariables: [],
  };

  if (!raw || typeof raw !== "object") return empty;

  // Unwrap envelope data if present (e.g. { success: true, data: { ... } })
  const payload: any =
    "data" in (raw as any) && (raw as any).data && typeof (raw as any).data === "object"
      ? (raw as any).data
      : raw;

  const rawModule = payload.Module ?? payload.module ?? payload.module_name ?? defaultModuleName;
  const moduleName = String(rawModule).trim().toLowerCase();

  const primaryKeysRaw =
    payload.Module_Keys ??
    payload.module_keys ??
    payload.ModuleKeys ??
    payload.keys ??
    payload.fields;

  const relatedModulesRaw =
    payload.Related_Modules ??
    payload.related_modules ??
    payload.RelatedModules ??
    payload.related;

  const primaryKeys: VariableItem[] = [];
  const relatedModules: Record<string, VariableItem[]> = {};
  const allVariables: VariableItem[] = [];
  const seenTags = new Set<string>();

  const createFieldItem = (
    fieldInput: any,
    currentModule: string,
    isRelated: boolean,
  ): VariableItem | null => {
    if (!fieldInput) return null;

    let fieldKey = "";
    let fieldLabel = "";
    let desc: string | undefined;

    if (typeof fieldInput === "string") {
      fieldKey = fieldInput.trim().replace(/^<|>$/g, "");
      fieldLabel = formatFieldLabel(fieldKey);
    } else if (typeof fieldInput === "object") {
      const rawKey =
        fieldInput.field_name ??
        fieldInput.api_name ??
        fieldInput.name ??
        fieldInput.key ??
        fieldInput.value ??
        fieldInput.id;
      if (!rawKey) return null;
      fieldKey = String(rawKey).trim().replace(/^<|>$/g, "");
      fieldLabel =
        fieldInput.label ??
        fieldInput.display_name ??
        fieldInput.title ??
        formatFieldLabel(fieldKey);
      desc =
        fieldInput.description ??
        fieldInput.help_text ??
        (fieldInput.type ? `Type: ${fieldInput.type}` : undefined);
    } else {
      return null;
    }

    if (!fieldKey) return null;

    const tag = buildTag(currentModule, fieldKey, isRelated);
    if (seenTags.has(tag)) return null;
    seenTags.add(tag);

    const category = currentModule.toLowerCase();
    const categoryLabel = formatFieldLabel(category);

    return {
      key: isRelated ? `${category}.${fieldKey}` : fieldKey,
      label: fieldLabel,
      tag,
      category,
      categoryLabel,
      parentModule: category,
      isRelated,
      description: desc,
    };
  };

  // 1. Process Primary Module Keys
  if (Array.isArray(primaryKeysRaw)) {
    for (const item of primaryKeysRaw) {
      const fieldItem = createFieldItem(item, moduleName, false);
      if (fieldItem) {
        primaryKeys.push(fieldItem);
        allVariables.push(fieldItem);
      }
    }
  }

  // 2. Process Related Modules and their inner object keys
  if (relatedModulesRaw && typeof relatedModulesRaw === "object") {
    for (const [relModName, relFields] of Object.entries(relatedModulesRaw)) {
      const modCategory = relModName.trim().toLowerCase();
      const list: VariableItem[] = [];

      if (Array.isArray(relFields)) {
        for (const item of relFields) {
          const fieldItem = createFieldItem(item, modCategory, true);
          if (fieldItem) {
            list.push(fieldItem);
            allVariables.push(fieldItem);
          }
        }
      } else if (relFields && typeof relFields === "object") {
        for (const [innerKey, innerVal] of Object.entries(relFields)) {
          const fieldItem = createFieldItem(
            typeof innerVal === "object" ? innerVal : innerKey,
            modCategory,
            true,
          );
          if (fieldItem) {
            list.push(fieldItem);
            allVariables.push(fieldItem);
          }
        }
      }

      if (list.length > 0) {
        relatedModules[modCategory] = list;
      }
    }
  }

  // 3. Fallback: if payload was a flat array of field objects
  if (primaryKeys.length === 0 && Object.keys(relatedModules).length === 0 && Array.isArray(payload)) {
    for (const item of payload) {
      const fieldItem = createFieldItem(item, moduleName, false);
      if (fieldItem) {
        primaryKeys.push(fieldItem);
        allVariables.push(fieldItem);
      }
    }
  }

  return {
    moduleName,
    primaryKeys,
    relatedModules,
    allVariables,
  };
}

/**
 * Fetch variables/options dynamically from listmodules API endpoint.
 * GET listmodules?module_name=quotations (or orders)
 */
export async function fetchModuleVariables(
  moduleName = "quotations",
): Promise<ModuleVariablesData> {
  try {
    const { data } = await api.get("listmodules", {
      params: { module_name: moduleName },
      skipErrorToast: true,
    });
    return parseModuleVariables(data, moduleName);
  } catch (err) {
    console.warn(`[fetchModuleVariables] Failed to load variables for ${moduleName}:`, err);
    throw err;
  }
}

// ── Template Keys Extraction ───────────────────────────────────────────────────

export interface TemplateKeyItem {
  Key: string;
  Type: string;
  Module: string;
}

/**
 * Known HTML element names to exclude from variable extraction.
 * These are real HTML tags, NOT template variables.
 */
const HTML_ELEMENTS = new Set([
  "a","abbr","address","area","article","aside","audio","b","base","bdi","bdo",
  "blockquote","body","br","button","canvas","caption","cite","code","col",
  "colgroup","data","datalist","dd","del","details","dfn","dialog","div","dl",
  "dt","em","embed","fieldset","figcaption","figure","footer","form","h1","h2",
  "h3","h4","h5","h6","head","header","hgroup","hr","html","i","iframe","img",
  "input","ins","kbd","label","legend","li","link","main","map","mark","menu",
  "meta","meter","nav","noscript","object","ol","optgroup","option","output","p",
  "picture","pre","progress","q","rp","rt","ruby","s","samp","script","section",
  "select","small","source","span","strong","style","sub","summary","sup","table",
  "tbody","td","template","textarea","tfoot","th","thead","time","title","tr",
  "track","u","ul","var","video","wbr",
]);

/**
 * Parses the TipTap HTML content and extracts all unique variable tags.
 *
 * Handles BOTH formats TipTap produces:
 *  - Raw tag inserted into text:  &lt;comment&gt;  (HTML-encoded in saved HTML)
 *  - Unencoded (edge cases):      <comment>
 *
 * Tag formats understood:
 *  - Primary field:  <field_name>          → Key: "field_name", Module: primaryModule, Type: "text"
 *  - Related field:  <module.field_name>   → Key: "field_name", Module: "module",      Type: "text"
 *
 * Returns an array matching the required request shape:
 * { Keys: [{ Key, Type, Module }] }
 */
export function extractTemplateKeys(
  htmlContent: string,
  primaryModule = "quotations",
): TemplateKeyItem[] {
  if (!htmlContent) return [];

  const seen = new Set<string>();
  const keys: TemplateKeyItem[] = [];

  const processMatch = (raw: string) => {
    const lower = raw.toLowerCase();
    // Skip known HTML element names
    if (HTML_ELEMENTS.has(lower)) return;
    // Skip if already processed
    if (seen.has(lower)) return;
    seen.add(lower);

    if (lower.includes(".")) {
      // Related field: <module.field>
      const dotIdx = lower.indexOf(".");
      const mod = lower.slice(0, dotIdx);
      const field = lower.slice(dotIdx + 1);
      keys.push({ Key: field, Type: "text", Module: mod });
    } else {
      // Primary field: <field>
      keys.push({ Key: lower, Type: "text", Module: primaryModule });
    }
  };

  // 1. Match HTML-encoded tags: &lt;comment&gt; or &lt;sections.deleted_at&gt;
  //    This is what TipTap produces when the variable is inserted as plain text
  const ENCODED_REGEX = /&lt;([a-z_][a-z0-9_.]*(?:\.[a-z_][a-z0-9_]*)?)&gt;/gi;
  let match: RegExpExecArray | null;
  while ((match = ENCODED_REGEX.exec(htmlContent)) !== null) {
    processMatch(match[1]);
  }

  // 2. Match raw unencoded tags: <comment> or <sections.deleted_at>
  //    (edge case — e.g. if content is pre-processed or set programmatically)
  const RAW_REGEX = /<([a-z_][a-z0-9_.]*(?:\.[a-z_][a-z0-9_]*)?)>/gi;
  while ((match = RAW_REGEX.exec(htmlContent)) !== null) {
    processMatch(match[1]);
  }

  return keys;
}


/**
 * Builds the template save payload as a plain object including Keys extracted from content.
 */
export function buildTemplateSaveObject(params: {
  name: string;
  content: string;
  moduleName?: string;
  category?: string;
  description?: string;
  [key: string]: unknown;
}) {
  const { name, content, moduleName = "quotations", ...rest } = params;
  const keys = extractTemplateKeys(content, moduleName);

  return {
    name,
    content,
    module: moduleName,
    ...rest,
    Keys: keys,
  };
}

/**
 * Converts a base64 data URL into a binary File object.
 */
export function dataUrlToFile(dataUrl: string, fileName?: string): File | null {
  try {
    const [header, base64] = dataUrl.split(",");
    if (!header || !base64) return null;
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch?.[1] || "image/png";
    const ext = mime.split("/")[1]?.replace("+xml", "") || "png";

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const name =
      fileName && fileName.includes(".")
        ? fileName
        : `image_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
    return new File([bytes], name, { type: mime });
  } catch {
    return null;
  }
}

/**
 * Scans HTML content for embedded data URLs (e.g. data:image/png;base64,...),
 * converts each into a binary File object, and replaces the massive base64 in the HTML
 * with a clean filename reference.
 */
export function extractBinaryFilesFromHtml(html: string): {
  files: File[];
  cleanHtml: string;
} {
  if (!html) return { files: [], cleanHtml: html };

  const files: File[] = [];
  const DATA_URL_REGEX = /<img\b([^>]*?)\bsrc=["'](data:([^;]+);base64,([^"']+))["']([^>]*?)>/gi;

  let index = 0;
  const cleanHtml = html.replace(
    DATA_URL_REGEX,
    (fullMatch, preAttrs, fullDataUrl, mimeType, base64Data, postAttrs) => {
      index++;
      const ext = mimeType.split("/")[1]?.replace("+xml", "") || "png";
      const altMatch = (preAttrs + postAttrs).match(/\balt=["']([^"']+)["']/i);
      const dataNameMatch = (preAttrs + postAttrs).match(/\bdata-filename=["']([^"']+)["']/i);
      const rawName = dataNameMatch?.[1] || altMatch?.[1];
      const fileName =
        rawName && rawName.includes(".") ? rawName : `image_${index}.${ext}`;

      const file = dataUrlToFile(fullDataUrl, fileName);
      if (file) {
        files.push(file);
        return `<img ${preAttrs}src="${fileName}" data-filename="${fileName}"${postAttrs}>`;
      }
      return fullMatch;
    }
  );

  return { files, cleanHtml };
}

/**
 * Builds the full template save payload as FormData with binary files attached.
 */
export function buildTemplateFormData(params: {
  name: string;
  content: string;
  moduleName?: string;
  category?: string;
  description?: string;
  files?: (File | Blob)[];
  file?: File | Blob;
  images?: (File | Blob)[];
  attachments?: (File | Blob)[];
  [key: string]: unknown;
}): FormData {
  const {
    name,
    content,
    moduleName = "quotations",
    files: explicitFiles,
    file: explicitFile,
    images: explicitImages,
    attachments: explicitAttachments,
    ...rest
  } = params;

  const keys = extractTemplateKeys(content, moduleName);

  // 1. Extract any embedded base64 data-URL images from the HTML and convert them to binary Files
  const { files: extractedFiles, cleanHtml } = extractBinaryFilesFromHtml(content);

  // 2. Aggregate all binary files
  const allBinaryFiles: File[] = [...extractedFiles];

  const collectFile = (item: unknown, fallbackName = "file") => {
    if (item instanceof File) {
      allBinaryFiles.push(item);
    } else if (item instanceof Blob) {
      allBinaryFiles.push(
        new File([item], fallbackName, { type: item.type || "application/octet-stream" })
      );
    }
  };

  if (Array.isArray(explicitFiles)) {
    explicitFiles.forEach((f, i) => collectFile(f, `file_${i + 1}`));
  }
  if (explicitFile) {
    collectFile(explicitFile, "file_primary");
  }
  if (Array.isArray(explicitImages)) {
    explicitImages.forEach((f, i) => collectFile(f, `image_${i + 1}`));
  }
  if (Array.isArray(explicitAttachments)) {
    explicitAttachments.forEach((f, i) => collectFile(f, `attachment_${i + 1}`));
  }

  // 3. Assemble FormData (Pure multipart with NO base64 strings)
  const fd = new FormData();
  fd.append("name", name);
  // Send clean HTML content without base64 strings so the payload is lightweight and references binary files
  fd.append("content", cleanHtml);
  fd.append("module", moduleName);
  fd.append("Keys", JSON.stringify(keys));

  // Deduplicate files by name and size
  const seenFileKeys = new Set<string>();
  const uniqueBinaryFiles: File[] = [];
  for (const file of allBinaryFiles) {
    const key = `${file.name}:${file.size}`;
    if (!seenFileKeys.has(key)) {
      seenFileKeys.add(key);
      uniqueBinaryFiles.push(file);
    }
  }

  // 4. Append all binary files with array indexing: files[0], files[1], etc.
  uniqueBinaryFiles.forEach((file, index) => {
    fd.append(`files[${index}]`, file, file.name);
  });

  // 6. Append any remaining fields in rest
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue;
    if (key === "files" || key === "file" || key === "images" || key === "attachments") continue;

    if (value instanceof File) {
      fd.append(key, value, value.name);
    } else if (value instanceof Blob) {
      fd.append(key, value, (value as File).name || "blob");
    } else if (Array.isArray(value) && value.some((v) => v instanceof Blob || v instanceof File)) {
      for (const item of value) {
        if (item instanceof File) {
          fd.append(key, item, item.name);
        } else if (item instanceof Blob) {
          fd.append(key, item, "blob");
        }
      }
    } else if (typeof value === "object") {
      fd.append(key, JSON.stringify(value));
    } else {
      fd.append(key, String(value));
    }
  }

  return fd;
}

/**
 * Default payload builder returning FormData for template creation/update.
 */
export const buildTemplateSavePayload = buildTemplateFormData;


