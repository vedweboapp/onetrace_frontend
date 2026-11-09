/**
 * Converts a sections API payload into FormData (multipart/form-data).
 *
 * When a picklist / multi-select option has:
 *   associated_value_type === "image"  AND  fileObject is a File instance
 *
 * → the File is appended to FormData with a fully-qualified bracket key:
 *     create[sectionIdx][fieldIdx][optionIdx][associated_value]
 *     update[sectionIdx][fieldIdx][optionIdx][associated_value]
 *
 * → the JSON keeps `__file_key__` pointing to that FormData field.
 * → `associated_value`, `file`, and `image_value` are set to null in JSON.
 *
 * FormData keys:
 *   "create"                                       → JSON.stringify(createSections)
 *   "update"                                       → JSON.stringify(updateSections)
 *   "delete"                                       → JSON.stringify(deleteSections)
 *   "create[0]field[1]option[2]associated_value"        → binary File
 *   "update[0]field[0]option[0]associated_value"        → binary File
 */

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const arr = dataUrl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
}

/**
 * Processes a single option. If it carries a File, appends it to `fd` under
 * the fully-qualified key and returns a JSON-safe clone.
 */
function processOption(
  opt: any,
  fd: FormData,
  key: string,          // e.g. "create[0]field[1]option[2]associated_value"
  altKey?: string,
): any {
  if (!opt || typeof opt !== "object") {
    return opt;
  }

  let fileToUpload: File | null = null;
  if (opt.fileObject instanceof File) {
    fileToUpload = opt.fileObject;
  } else if (
    typeof opt.file === "string" &&
    opt.file.startsWith("data:")
  ) {
    fileToUpload = dataUrlToFile(opt.file, opt.fileName ?? "upload.png");
  } else if (
    typeof opt.associated_value === "string" &&
    opt.associated_value.startsWith("data:")
  ) {
    fileToUpload = dataUrlToFile(opt.associated_value, opt.fileName ?? "upload.png");
  }

  if (fileToUpload) {
    const uploadName = fileToUpload.name ?? opt.fileName ?? "upload.png";
    fd.append(key, fileToUpload, uploadName);
    if (altKey && altKey !== key) {
      fd.append(altKey, fileToUpload, uploadName);
    }
    const { fileObject, associated_value, file, image_value, ...rest } = opt;
    return {
      ...rest,
      associated_value: null,
      file: null,
      image_value: null,
      __file_key__: key,
    };
  }

  // Strip fileObject even when no file is attached (not JSON-serialisable)
  if ("fileObject" in opt) {
    const { fileObject, ...rest } = opt;
    return rest;
  }
  return opt;
}

/**
 * Walks a single section's fields and processes every option.
 *
 * @param section    - The section object
 * @param fd         - FormData to append files to
 * @param groupKey   - "create" or "update"
 * @param sectionIdx - Index of this section within create/update array
 */
function extractSectionFiles(
  section: any,
  fd: FormData,
  groupKey: string,
  sectionIdx: number,
): any {
  if (!section || typeof section !== "object") return section;

  const clone: any = { ...section };

  if (Array.isArray(clone.fields)) {
    clone.fields = clone.fields.map((field: any, fieldIdx: number) => {
      const cloneField = { ...field };

      // field.config.options  (config object wrapping the options array)
      if (cloneField.config?.options) {
        cloneField.config = {
          ...cloneField.config,
          options: (cloneField.config.options as any[]).map((opt: any, optIdx: number) => {
            const fileKey = `${groupKey}[${sectionIdx}]field[${fieldIdx}]option[${optIdx}]associated_value`;
            return processOption(opt, fd, fileKey);
          }),
        };
      }

      // field.options  (options directly on the field)
      if (Array.isArray(cloneField.options)) {
        cloneField.options = (cloneField.options as any[]).map((opt: any, optIdx: number) => {
          const fileKey = `${groupKey}[${sectionIdx}]field[${fieldIdx}]option[${optIdx}]associated_value`;
          return processOption(opt, fd, fileKey);
        });
      }

      // field.associated_options  (non-default options)
      if (Array.isArray(cloneField.associated_options)) {
        cloneField.associated_options = (cloneField.associated_options as any[]).map((opt: any, optIdx: number) => {
          const fileKey = `${groupKey}[${sectionIdx}]field[${fieldIdx}]option[${optIdx}]associated_value`;
          const altKey = `${groupKey}[${sectionIdx}]field[${fieldIdx}]associated_option[${optIdx}]associated_value`;
          return processOption(opt, fd, fileKey, altKey);
        });
      }

      // Direct field file (image_upload / file_upload)
      if (cloneField.fileObject instanceof File) {
        const fileKey = `${groupKey}[${sectionIdx}]field[${fieldIdx}]file`;
        fd.append(fileKey, cloneField.fileObject, cloneField.fileObject.name ?? cloneField.fileName ?? "upload");
        delete cloneField.fileObject;
      }

      return cloneField;
    });
  }

  return clone;
}

/**
 * Converts a sections payload (array or differential object) into FormData.
 * Image files inside picklist options are appended as binary with
 * fully-indexed bracket-notation keys.
 */
export function sectionPayloadToFormData(sectionsPayload: any): FormData {
  const fd = new FormData();

  // Normalise array → { create }
  const payload: { create?: any[]; update?: any[]; delete?: any[] } =
    Array.isArray(sectionsPayload)
      ? { create: sectionsPayload }
      : (sectionsPayload ?? {});

  if (payload.create && payload.create.length > 0) {
    const processed = payload.create.map((sec: any, sectionIdx: number) =>
      extractSectionFiles(sec, fd, "create", sectionIdx)
    );
    fd.append("create", JSON.stringify(processed));
  }

  if (payload.update && payload.update.length > 0) {
    const processed = payload.update.map((sec: any, sectionIdx: number) =>
      extractSectionFiles(sec, fd, "update", sectionIdx)
    );
    fd.append("update", JSON.stringify(processed));
  }

  if (payload.delete && payload.delete.length > 0) {
    fd.append("delete", JSON.stringify(payload.delete));
  }

  return fd;
}
