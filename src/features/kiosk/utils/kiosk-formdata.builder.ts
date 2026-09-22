import type { KioskConfig, KioskOption } from "../types/kiosk.types";

/**
 * Converts a base64 Data URL to a Blob for multipart FormData upload
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    if (!dataUrl || !dataUrl.startsWith("data:")) return null;
    const parts = dataUrl.split(",");
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const binary = atob(parts[1]);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export function isDataUrl(val: any): boolean {
  return typeof val === "string" && val.startsWith("data:");
}

export function isBinaryFile(val: any): boolean {
  return (
    (typeof File !== "undefined" && val instanceof File) ||
    (typeof Blob !== "undefined" && val instanceof Blob)
  );
}

function isImageLookupQuestion(question: any): boolean {
  return Boolean(
    question?.is_lookup &&
      (question.lookup_option_type || "radio") === "image_radio",
  );
}

function sanitizeImageLookupOption(option: any): Record<string, unknown> {
  const placement = option?.placement || {};
  return {
    o_id: option?.o_id || option?.uid || option?._uid,
    composite_item_id: option?.composite_item_id,
    placement: {
      mode: placement.mode ?? option?.placement_mode ?? null,
      coordinates: placement.coordinates ?? null,
      target_field: placement.target_field ?? option?.target_image_field ?? null,
      target_fields: placement.target_fields ?? option?.placement_targets ?? null,
      target_question:
        placement.target_question ?? option?.placement_target_question ?? null,
    },
  };
}

function stripImageLookupOptionFields(schema: any): void {
  for (const question of schema?.questions || []) {
    if (!isImageLookupQuestion(question)) continue;

    if (Array.isArray(question.options)) {
      question.options = question.options.map(sanitizeImageLookupOption);
    }
    for (const group of question.groups || []) {
      if (Array.isArray(group.options)) {
        group.options = group.options.map(sanitizeImageLookupOption);
      }
    }
  }
}

/**
 * Appends binary image files (image and fill_image) for an option at a given hierarchical key
 */
function appendOptionBinaryFiles(
  fd: FormData,
  prefix: string,
  option: KioskOption,
  optIndex: number,
) {
  // 1. Option image file -> questions[qIndex][options][optIndex][image_file]
  if (option.image) {
    const fileKey = `${prefix}[image_file]`;
    if (isDataUrl(option.image)) {
      const blob = dataUrlToBlob(option.image);
      if (blob) {
        const ext = blob.type.split("/")[1] || "png";
        const name = `${option.api_name || option.o_id || option.uid || `option_${optIndex}`}.${ext}`;
        const file = typeof File !== "undefined" ? new File([blob], name, { type: blob.type }) : blob;
        fd.append(fileKey, file, name);
      }
    } else if (isBinaryFile(option.image)) {
      const name = (option.image as unknown as File).name || `${option.api_name || option.o_id || option.uid || `option_${optIndex}`}.png`;
      fd.append(fileKey, option.image as any, name);
    }
  }

  // 2. Option fill_image file -> questions[qIndex][options][optIndex][fill_image_file]
  if (option.fill_image) {
    const fileKey = `${prefix}[fill_image_file]`;
    if (isDataUrl(option.fill_image)) {
      const blob = dataUrlToBlob(option.fill_image);
      if (blob) {
        const ext = blob.type.split("/")[1] || "png";
        const name = `${option.api_name || option.o_id || option.uid || `option_${optIndex}`}_fill.${ext}`;
        const file = typeof File !== "undefined" ? new File([blob], name, { type: blob.type }) : blob;
        fd.append(fileKey, file, name);
      }
    } else if (isBinaryFile(option.fill_image)) {
      const name = (option.fill_image as unknown as File).name || `${option.api_name || option.o_id || option.uid || `option_${optIndex}`}_fill.png`;
      fd.append(fileKey, option.fill_image as any, name);
    }
  }
}

/**
 * Builds a multipart FormData payload from a KioskConfig object:
 * - The entire non-file schema is serialized as a JSON string under the key: "JSONString"
 * - All binary files (image_file, fill_image_file) are appended as binary blobs/files using hierarchical keys:
 *   - Ungrouped: questions[qIndex][options][optIndex][image_file]
 *   - Grouped:   questions[qIndex][groups][gIndex][options][optIndex][image_file]
 */
export function buildKioskFormData(config: KioskConfig): FormData {
  const fd = new FormData();

  // Create clean schema for JSONString (strip giant base64 data URLs from JSON payload since binary files are sent separately)
  const jsonSchema = JSON.parse(
    JSON.stringify(config, (key, value) => {
      if (typeof value === "string" && value.startsWith("data:")) {
        return "";
      }
      if (isBinaryFile(value)) {
        return "";
      }
      return value;
    }),
  );

  stripImageLookupOptionFields(jsonSchema);

  // 1. Append the schema JSON string under key "JSONString"
  fd.append("JSONString", JSON.stringify(jsonSchema));

  // 2. Append all binary image files
  const questions = config.questions || [];

  questions.forEach((q, qIndex) => {
    const qPrefix = `questions[${qIndex}]`;

    if (q.groups && q.groups.length > 0) {
      q.groups.forEach((g, gIndex) => {
        const gPrefix = `${qPrefix}[groups][${gIndex}]`;
        (isImageLookupQuestion(q) ? [] : g.options || []).forEach((opt, optIndex) => {
          const optPrefix = `${gPrefix}[options][${optIndex}]`;
          appendOptionBinaryFiles(fd, optPrefix, opt, optIndex);
        });
      });
    } else {
      (isImageLookupQuestion(q) ? [] : q.options || []).forEach((opt, optIndex) => {
        const optPrefix = `${qPrefix}[options][${optIndex}]`;
        appendOptionBinaryFiles(fd, optPrefix, opt, optIndex);
      });
    }
  });

  return fd;
}

/**
 * Returns a debug representation of a FormData object for logging to console
 */
export function formDataToDebugEntries(fd: FormData): Record<string, any> {
  const result: Record<string, any> = {};
  fd.forEach((val, key) => {
    if (typeof File !== "undefined" && val instanceof File) {
      result[key] = `[File: ${val.name} (${val.type}, ${val.size} bytes)]`;
    } else if (typeof Blob !== "undefined" && val instanceof Blob) {
      result[key] = `[Blob: ${val.type} (${val.size} bytes)]`;
    } else if (key === "JSONString") {
      try {
        result[key] = JSON.parse(val as string);
      } catch {
        result[key] = val;
      }
    } else {
      result[key] = val;
    }
  });
  return result;
}
