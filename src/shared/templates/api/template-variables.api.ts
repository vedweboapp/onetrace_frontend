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
  Columns?: string[];
  columns?: string[];
  [key: string]: unknown;
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
 * Parses the TipTap HTML content and extracts all unique variable tags,
 * as well as items/pins table blocks with their configured columns.
 *
 * Handles:
 *  - Raw tag inserted into text:  &lt;comment&gt;  (HTML-encoded in saved HTML)
 *  - Unencoded (edge cases):      <comment>
 *  - Items / Pins Table blocks:   <div data-pins-table="true" ...> → Key: "items_table", Type: "table", Module: "pins", Columns: [...]
 *
 * Returns an array matching the required request shape:
 * { Keys: [{ Key, Type, Module, Columns }] }
 */
export function extractTemplateKeys(
  htmlContent: string,
  primaryModule = "quotations",
): TemplateKeyItem[] {
  if (!htmlContent) return [];

  const seen = new Set<string>();
  const keys: TemplateKeyItem[] = [];

  // 1. Match signature blocks first:
  //    <div data-signature-block="true" data-image-key="..." data-label="...">
  //    or <div data-signature-block="true" ...><img src="<key>" ... /></div>
  const SIGNATURE_BLOCK_REGEX =
    /<div\b([^>]*\bdata-signature-block=["']?true["']?[^>]*)>(?:([\s\S]*?)<\/div\s*>|)/gi;
  let sigMatch: RegExpExecArray | null;
  while ((sigMatch = SIGNATURE_BLOCK_REGEX.exec(htmlContent)) !== null) {
    const attrsStr = sigMatch[1];
    const innerHtml = sigMatch[2] || "";

    const imgKeyMatch = attrsStr.match(/\bdata-image-key=["']([^"']*)["']/i);
    const innerSrcMatch = innerHtml.match(/<img\b[^>]*\bsrc=["'](?:&lt;|<)?([^"'>]+?)(?:&gt;|>)?["']/i);
    const rawKey = imgKeyMatch?.[1] || innerSrcMatch?.[1] || "";
    const cleanKey = rawKey.replace(/^[<]|>$|^&lt;|&gt;$/g, "").trim();

    const dedupeKey = `signature:${cleanKey.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    let mod = primaryModule;
    let field = cleanKey || "signature";
    if (cleanKey.includes(".")) {
      const parts = cleanKey.split(".");
      mod = parts[0];
      field = parts.slice(1).join(".");
    }

    if (cleanKey) {
      seen.add(cleanKey.toLowerCase());
      seen.add(field.toLowerCase());
      seen.add(`&lt;${cleanKey.toLowerCase()}&gt;`);
    }

    keys.push({
      Key: field,
      Type: "signature",
      Module: mod,
    } as TemplateKeyItem);
  }

  // 2. Match items table / pins table blocks:
  //    <div data-pins-table="true" data-key="..." data-module="..." data-type="..." data-columns="..." data-aggregate-columns="...">
  const PINS_TABLE_REGEX = /<div\b([^>]*\bdata-pins-table=["']?true["']?[^>]*)>/gi;
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = PINS_TABLE_REGEX.exec(htmlContent)) !== null) {
    const attrsStr = tableMatch[1];

    const keyMatch = attrsStr.match(/\bdata-key=["']([^"']*)["']/i);
    const tableKey = keyMatch?.[1] || "items_table";

    // Deduplicate if already extracted
    const dedupeKey = `table:${tableKey.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const typeMatch = attrsStr.match(/\bdata-type=["']([^"']*)["']/i);
    const rawType = typeMatch?.[1];
    const tableType = !rawType || rawType === "table" ? "item_table" : rawType;

    const modMatch = attrsStr.match(/\bdata-module=["']([^"']*)["']/i);
    const tableModule = modMatch?.[1] || "pins";

    const colsMatch = attrsStr.match(/\bdata-columns=["']([^"']*)["']/i);
    let columnsList: string[] = [];
    if (colsMatch && colsMatch[1]) {
      const rawCols = colsMatch[1];
      if (rawCols.startsWith("[") && rawCols.endsWith("]")) {
        try {
          const parsed = JSON.parse(rawCols);
          if (Array.isArray(parsed)) columnsList = parsed;
        } catch {
          columnsList = rawCols.split(",").map((s) => s.trim()).filter(Boolean);
        }
      } else {
        columnsList = rawCols.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    if (columnsList.length === 0) {
      columnsList = ["snapshot", "location", "item_name", "variation", "quantity", "unit_price", "total_price"];
    }

    // Rule: Quantity and Price cannot be omitted
    const colSet = new Set(columnsList);
    colSet.add("quantity");
    colSet.add("unit_price");
    colSet.add("total_price");
    columnsList = Array.from(colSet);

    // Parse aggregate_columns (subtotal / VAT / total rows)
    const aggColsAttrMatch = attrsStr.match(/\bdata-aggregate-columns=["']([^"']*)["']/i);
    let aggregateColumnsList: Array<{ label: string; variable: string }> = [];
    if (aggColsAttrMatch && aggColsAttrMatch[1]) {
      try {
        const decoded = aggColsAttrMatch[1].replace(/&quot;/g, '"');
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) aggregateColumnsList = parsed;
      } catch {
        aggregateColumnsList = [];
      }
    }

    const aggFormatted = aggregateColumnsList.map((agg) => {
      const rawVar = (agg as any).variable || (agg as any).Key || (agg as any).key || "";
      const label = (agg as any).label || (agg as any).Label || "";
      let mod = (agg as any).Module || (agg as any).module || tableModule;
      let field = rawVar;
      if (rawVar.includes(".")) {
        const dotIdx = rawVar.indexOf(".");
        mod = rawVar.slice(0, dotIdx);
        field = rawVar.slice(dotIdx + 1);
      }
      return {
        Key: field,
        Type: "text",
        Module: mod,
        label: label,
      };
    });

    keys.push({
      Key: tableKey,
      Type: tableType,
      Module: tableModule,
      Columns: columnsList,
      aggregate_columns: aggFormatted,
    });
  }

  // 3. Match dynamic image variable blocks or comments:
  //    <!--Image key="key" width="..." scale="..." ... --> or <div data-image-variable="true" ...>
  const IMAGE_BLOCK_REGEX =
    /(?:<!--\s*Image\b([^>]*?)\s*(?:-->|--1>)|<div\b([^>]*\bdata-image-variable=["']?true["']?[^>]*)>)/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = IMAGE_BLOCK_REGEX.exec(htmlContent)) !== null) {
    const rawAttrs = imgMatch[1] || imgMatch[2] || "";
    const keyMatch =
      rawAttrs.match(/\b(?:key|data-key|data-image-key)=["']([^"']+)["']/i);
    const rawKey = keyMatch?.[1] || "";
    const cleanKey = rawKey.replace(/^[<]|>$|^&lt;|&gt;$/g, "").trim();
    if (!cleanKey) continue;

    const dedupeKey = `image:${cleanKey.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const widthMatch = rawAttrs.match(/\b(?:width|data-width)=["']([^"']+)["']/i);
    const width = widthMatch?.[1] || "360px";

    const heightMatch = rawAttrs.match(/\b(?:height|data-height)=["']([^"']+)["']/i);
    const height = heightMatch?.[1] || "auto";

    const scaleMatch = rawAttrs.match(/\b(?:scale|data-scale)=["']([^"']+)["']/i);
    const scale = scaleMatch?.[1] ? Number(scaleMatch[1]) : 1;

    const alignMatch = rawAttrs.match(/\b(?:alignment|data-alignment)=["']([^"']+)["']/i);
    const alignment = alignMatch?.[1] || "left";

    const rotateMatch = rawAttrs.match(/\b(?:rotate|data-rotate)=["']([^"']+)["']/i);
    const rotate = Number(rotateMatch?.[1]) || 0;

    const flipMatch = rawAttrs.match(/\b(?:flipH|data-flip-h)=["']([^"']+)["']/i);
    const flipH = flipMatch?.[1] === "true";

    let mod = primaryModule;
    let field = cleanKey;
    if (cleanKey.includes(".")) {
      const parts = cleanKey.split(".");
      mod = parts[0];
      field = parts.slice(1).join(".");
    }

    seen.add(cleanKey.toLowerCase());
    seen.add(field.toLowerCase());
    seen.add(`&lt;${cleanKey.toLowerCase()}&gt;`);

    keys.push({
      Key: field,
      Type: "image",
      Module: mod,
      Width: width,
      width: width,
      Height: height,
      height: height,
      Scale: scale,
      scale: scale,
      Alignment: alignment,
      alignment: alignment,
      Rotate: rotate,
      rotate: rotate,
      FlipH: flipH,
      flipH: flipH,
    } as TemplateKeyItem);
  }

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

  // 3. Match HTML-encoded tags: &lt;comment&gt; or &lt;sections.deleted_at&gt;
  const ENCODED_REGEX = /&lt;([a-z_][a-z0-9_.]*(?:\.[a-z_][a-z0-9_]*)?)&gt;/gi;
  let match: RegExpExecArray | null;
  while ((match = ENCODED_REGEX.exec(htmlContent)) !== null) {
    processMatch(match[1]);
  }

  // 4. Match raw unencoded tags: <comment> or <sections.deleted_at>
  const RAW_REGEX = /<([a-z_][a-z0-9_.]*(?:\.[a-z_][a-z0-9_]*)?)>/gi;
  while ((match = RAW_REGEX.exec(htmlContent)) !== null) {
    processMatch(match[1]);
  }

  return keys;
}


/**
 * Replaces preview divs of the items/pins table in the HTML content with
 * clean comments (<!-- items_table -->). Signature blocks are preserved as styled divs
 * with the key name in the image src (<key>) so the backend can fill in the real signature,
 * omitting any editor configuration UI.
 */
export function serializeContentWithTableComments(html: string): string {
  if (!html) return html;

  // 1. Serialize pins/items table blocks → <!-- items_table -->
  let result = html.replace(
    /<div\b[^>]*\bdata-pins-table=["']?true["']?[^>]*>(?:[\s\S]*?<\/div>|)/gi,
    (match) => {
      const keyMatch = match.match(/\bdata-key=["']([^"']*)["']/i);
      const key = keyMatch?.[1] || "items_table";
      return `<!-- ${key} -->`;
    },
  );

  // 2. Format signature blocks: Do NOT send comment!
  // Send the clean signature div with the key name in the image src (<key>),
  // without any configuration UI or toolbar divs.
  result = result.replace(
    /<div\b([^>]*\bdata-signature-block=["']?true["']?[^>]*)>(?:([\s\S]*?)<\/div\s*>|)/gi,
    (match, attrsStr, innerContent) => {
      const imgKeyMatch = attrsStr.match(/\bdata-image-key=["']([^"']*)["']/i);
      const innerSrcMatch = (innerContent || "").match(/<img\b[^>]*\bsrc=["'](?:&lt;|<)?([^"'>]+?)(?:&gt;|>)?["']/i);
      const rawKey = imgKeyMatch?.[1] || innerSrcMatch?.[1] || "";
      const cleanKey = rawKey.replace(/^[<]|>$|^&lt;|&gt;$/g, "").trim() || "signature";

      const widthMatch = attrsStr.match(/\bdata-width=["']([^"']*)["']/i);
      const width = widthMatch?.[1] || "320px";

      const alignMatch = attrsStr.match(/\bdata-alignment=["']([^"']*)["']/i);
      const alignment = alignMatch?.[1] || "left";

      const rotateMatch = attrsStr.match(/\bdata-rotate=["']([^"']*)["']/i);
      const rotate = Number(rotateMatch?.[1]) || 0;

      const flipMatch = attrsStr.match(/\bdata-flip-h=["']([^"']*)["']/i);
      const flipH = flipMatch?.[1] === "true";

      const alignMargin =
        alignment === "center"
          ? "margin: 16px auto;"
          : alignment === "right"
          ? "margin: 16px 0 16px auto;"
          : "margin: 16px 0;";

      const transformStyle =
        rotate || flipH
          ? `transform: rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}); transform-origin: center center;`
          : "";

      return `<div data-signature-block="true" data-image-key="${cleanKey}" data-width="${width}" data-alignment="${alignment}" data-rotate="${rotate}" data-flip-h="${flipH}" class="signature-block" style="width: ${width}; max-width: 100%; ${alignMargin} box-sizing: border-box; page-break-inside: avoid;"><div class="signature-preview-container" style="border: 2px dashed #cbd5e1; border-radius: 8px; background-color: #f8fafc; padding: 14px; min-height: 100px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;"><img src="<${cleanKey}>" alt="signature" class="signature-image" style="max-width: 100%; height: auto; max-height: 120px; object-fit: contain; display: block; margin: 0 auto; ${transformStyle}" /></div></div>`;
    },
  );

  // 3. Serialize dynamic image variable blocks → <!--Image key="key" width="..." scale="..." alignment="..." rotate="..." flipH="..." -->
  result = result.replace(
    /<div\b([^>]*\bdata-image-variable=["']?true["']?[^>]*)>(?:[\s\S]*?<\/div\s*>|)/gi,
    (match, attrsStr) => {
      const src = attrsStr || match;
      const keyMatch = src.match(/\bdata-key=["']([^"']*)["']/i);
      const key = keyMatch?.[1] || "image_key";

      const widthMatch = src.match(/\bdata-width=["']([^"']*)["']/i);
      const width = widthMatch?.[1] || "360px";

      const heightMatch = src.match(/\bdata-height=["']([^"']*)["']/i);
      const height = heightMatch?.[1] || "auto";

      const scaleMatch = src.match(/\bdata-scale=["']([^"']*)["']/i);
      const scale = scaleMatch?.[1] ? Number(scaleMatch[1]) : 1;

      const alignMatch = src.match(/\bdata-alignment=["']([^"']*)["']/i);
      const alignment = alignMatch?.[1] || "left";

      const rotateMatch = src.match(/\bdata-rotate=["']([^"']*)["']/i);
      const rotate = Number(rotateMatch?.[1]) || 0;

      const flipMatch = src.match(/\bdata-flip-h=["']([^"']*)["']/i);
      const flipH = flipMatch?.[1] === "true";

      const parts = [`key="${key}"`];
      if (width) parts.push(`width="${width}"`);
      if (height && height !== "auto") parts.push(`height="${height}"`);
      if (scale !== undefined && !isNaN(scale)) parts.push(`scale="${scale}"`);
      if (alignment) parts.push(`alignment="${alignment}"`);
      if (rotate) parts.push(`rotate="${rotate}"`);
      if (flipH) parts.push(`flipH="true"`);

      return `<!--Image ${parts.join(" ")} -->`;
    },
  );

  return result;
}

/**
 * Detects items table signature comments or tags in the saved HTML content
 * (e.g. <!-- items_table --> or <!-- item_table --> or <items_table>)
 * and fetches the configuration from the keys array to dynamically render
 * the preview table with the configured columns in the editor.
 */
export function hydrateTablesFromKeys(
  html: string,
  keys?: { Key?: string; Type?: string; Module?: string; Columns?: string[]; columns?: string[] }[],
): string {
  if (!html) return html;

  const tableKeyItems = Array.isArray(keys)
    ? keys.filter(
        (k) =>
          k.Type === "item_table" ||
          k.Key === "items_table" ||
          k.Key === "pins_table" ||
          (k as any).type === "item_table",
      )
    : [];

  const defaultTableKeyItem = tableKeyItems[0];

  const SIGNATURE_REGEX =
    /(?:<!--\s*(items?_table|pins(?:_table)?)\s*-->|&lt;\s*(items?_table|pins(?:_table)?)\s*&gt;|<\s*(items?_table|pins(?:_table)?)\s*>)/gi;

  const replaceWithDiv = (sigKey: string) => {
    const matchedKeyItem =
      tableKeyItems.find(
        (k) => k.Key?.toLowerCase() === sigKey.toLowerCase(),
      ) || defaultTableKeyItem;

    const rawCols =
      matchedKeyItem?.Columns ||
      matchedKeyItem?.columns ||
      ["snapshot", "location", "item_name", "variation", "quantity", "unit_price", "total_price"];

    const colSet = new Set(rawCols);
    colSet.add("quantity");
    colSet.add("unit_price");
    colSet.add("total_price");
    const cols = Array.from(colSet);

    const key = matchedKeyItem?.Key || sigKey || "items_table";
    const type = matchedKeyItem?.Type || "item_table";
    const module = matchedKeyItem?.Module || "pins";

    const aggCols = (matchedKeyItem as any)?.aggregate_columns;
    const aggAttr =
      Array.isArray(aggCols) && aggCols.length > 0
        ? ` data-aggregate-columns='${JSON.stringify(aggCols)}'`
        : "";

    return `<div data-pins-table="true" data-key="${key}" data-type="${type}" data-module="${module}" data-columns="${cols.join(",")}" data-title="Pins List" data-include-total="true"${aggAttr}></div>`;
  };

  // If already contains <div data-pins-table="true", synchronize columns from keys if present
  if (/<div\b[^>]*\bdata-pins-table=["']?true["']?/i.test(html)) {
    return html.replace(
      /<div\b([^>]*\bdata-pins-table=["']?true["']?[^>]*)>/gi,
      (match, attrsStr) => {
        const keyMatch = attrsStr.match(/\bdata-key=["']([^"']*)["']/i);
        const key = keyMatch?.[1] || "items_table";
        const matchedKeyItem =
          tableKeyItems.find(
            (k) => k.Key?.toLowerCase() === key.toLowerCase(),
          ) || defaultTableKeyItem;

        if (matchedKeyItem) {
          let updated = match;
          const cols = matchedKeyItem.Columns || matchedKeyItem.columns;
          if (cols && cols.length > 0) {
            updated = updated.replace(
              /\bdata-columns=["'][^"']*["']/i,
              `data-columns="${cols.join(",")}"`,
            );
          }
          const aggCols = (matchedKeyItem as any)?.aggregate_columns;
          if (Array.isArray(aggCols) && aggCols.length > 0) {
            if (/\bdata-aggregate-columns=["'][^"']*["']/i.test(updated)) {
              updated = updated.replace(
                /\bdata-aggregate-columns=["'][^"']*["']/i,
                `data-aggregate-columns='${JSON.stringify(aggCols)}'`,
              );
            } else {
              updated = updated.replace(/>$/, ` data-aggregate-columns='${JSON.stringify(aggCols)}'>`);
            }
          }
          return updated;
        }
        return match;
      },
    );
  }

  // Replace table signature comments -> preview divs
  let result = html.replace(SIGNATURE_REGEX, (_full, g1, g2, g3) => {
    const sigKey = g1 || g2 || g3 || "items_table";
    return replaceWithDiv(sigKey);
  });

  // Replace legacy signature block comments -> signature preview divs
  // Pattern: <!-- signature:imageKey:encodedLabel -->
  result = result.replace(
    /<!--\s*signature:([^:\s]*):?([^-\s]*)\s*-->/gi,
    (_full, imageKey) => {
      const cleanKey = (imageKey || "signature").replace(/^[<]|>$|^&lt;|&gt;$/g, "").trim();
      return `<div data-signature-block="true" data-image-key="${cleanKey}" data-width="320px" data-alignment="left"><div class="signature-preview-container" style="border: 2px dashed #cbd5e1; border-radius: 8px; background-color: #f8fafc; padding: 14px; min-height: 100px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;"><img src="<${cleanKey}>" alt="signature" class="signature-image" style="max-width: 100%; height: auto; max-height: 120px; object-fit: contain; display: block; margin: 0 auto;" /></div></div>`;
    },
  );

  // Replace dynamic image comments <!--Image ... --> -> dynamic image preview divs
  result = result.replace(
    /<!--\s*Image\b([^>]*?)\s*(?:-->|--1>)/gi,
    (_full, attrsStr) => {
      const keyMatch = attrsStr.match(/\bkey=["']([^"']*)["']/i);
      const key = keyMatch?.[1] || "image_key";

      const widthMatch = attrsStr.match(/\bwidth=["']([^"']*)["']/i);
      const width = widthMatch?.[1] || "360px";

      const heightMatch = attrsStr.match(/\bheight=["']([^"']*)["']/i);
      const height = heightMatch?.[1] || "auto";

      const scaleMatch = attrsStr.match(/\bscale=["']([^"']*)["']/i);
      const scale = scaleMatch?.[1] || "1";

      const alignMatch = attrsStr.match(/\balignment=["']([^"']*)["']/i);
      const alignment = alignMatch?.[1] || "left";

      const rotateMatch = attrsStr.match(/\brotate=["']([^"']*)["']/i);
      const rotate = rotateMatch?.[1] || "0";

      const flipMatch = attrsStr.match(/\bflipH=["']([^"']*)["']/i);
      const flipH = flipMatch?.[1] === "true";

      return `<div data-image-variable="true" data-key="${key}" data-width="${width}" data-height="${height}" data-scale="${scale}" data-alignment="${alignment}" data-rotate="${rotate}" data-flip-h="${flipH}"></div>`;
    },
  );

  return result;
}


/**
 * Builds the template save payload as a plain object including Keys extracted from content.
 * Content is sent with a clean comment signature <!-- items_table --> instead of the preview div.
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

  // Send clean signature comment <!-- items_table --> instead of the preview div
  const payloadContent = serializeContentWithTableComments(content);

  return {
    template_name: name,
    content: payloadContent,
    module_name: moduleName,
    ...rest,
    keys,
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
  fd.append("template_name", name);
  // Send clean HTML content without base64 strings and with signature comments instead of preview divs
  const payloadHtml = serializeContentWithTableComments(cleanHtml);
  fd.append("content", payloadHtml);
  fd.append("module_name", moduleName);
  fd.append("keys", JSON.stringify(keys));

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

  // 4. Append all binary files under the plain repeated "attachments" key
  uniqueBinaryFiles.forEach((file) => {
    fd.append("attachments", file, file.name);
  });

  // 6. Append any remaining fields in rest
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue;
    if (
      key === "files" ||
      key === "file" ||
      key === "images" ||
      key === "attachments"
    ) {
      continue;
    }

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


