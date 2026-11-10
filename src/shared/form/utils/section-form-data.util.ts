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
  key: string,          // e.g. "create[0]field[1]option[2]file"
  associatedType?: string,
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
    typeof opt.image === "string" &&
    opt.image.startsWith("data:")
  ) {
    fileToUpload = dataUrlToFile(opt.image, opt.fileName ?? "upload.png");
  } else if (
    typeof opt.associated_value === "string" &&
    opt.associated_value.startsWith("data:")
  ) {
    fileToUpload = dataUrlToFile(opt.associated_value, opt.fileName ?? "upload.png");
  }

  // Append binary file under single key, e.g. create[0]field[0]option[0]file
  if (fileToUpload) {
    const uploadName = fileToUpload.name ?? opt.fileName ?? "upload.png";
    fd.append(key, fileToUpload, uploadName);
  }

  const isImageOption =
    associatedType === "image" ||
    "file" in opt ||
    "image" in opt ||
    "image_value" in opt ||
    Boolean(fileToUpload);

  if (isImageOption) {
    let existingFile: string | null = null;
    // Only keep existing remote URLs (http/https); newly uploaded files/blobs become null
    if (!fileToUpload) {
      if (typeof opt.file === "string" && !opt.file.startsWith("data:") && !opt.file.startsWith("blob:")) {
        existingFile = opt.file;
      } else if (typeof opt.image === "string" && !opt.image.startsWith("data:") && !opt.image.startsWith("blob:")) {
        existingFile = opt.image;
      }
    }

    return {
      label: String(opt.label ?? ""),
      value: opt.value !== undefined ? opt.value : null,
      file: existingFile,
    };
  }

  if (associatedType === "color") {
    return {
      label: String(opt.label ?? ""),
      value: opt.value !== undefined ? opt.value : null,
    };
  }

  // Strip fileObject even when no file is attached (not JSON-serialisable)
  if ("fileObject" in opt) {
    const { fileObject, fileName, fileType, fileSize, ...rest } = opt;
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
        const assocType = String(cloneField.associated_value_type || cloneField.config?.associated_value_type || "").toLowerCase();
        cloneField.config = {
          ...cloneField.config,
          options: (cloneField.config.options as any[]).map((opt: any, optIdx: number) => {
            const fileKey = `${groupKey}[${sectionIdx}]field[${fieldIdx}]option[${optIdx}]file`;
            return processOption(opt, fd, fileKey, assocType);
          }),
        };
      }

      // field.options  (options directly on the field)
      if (Array.isArray(cloneField.options)) {
        const assocType = String(cloneField.associated_value_type || "").toLowerCase();
        cloneField.options = (cloneField.options as any[]).map((opt: any, optIdx: number) => {
          const fileKey = `${groupKey}[${sectionIdx}]field[${fieldIdx}]option[${optIdx}]file`;
          return processOption(opt, fd, fileKey, assocType);
        });
      }

      // field.associated_options  (non-default options)
      if (Array.isArray(cloneField.associated_options)) {
        const assocType = String(cloneField.associated_value_type || "").toLowerCase();
        cloneField.associated_options = (cloneField.associated_options as any[]).map((opt: any, optIdx: number) => {
          const fileKey = `${groupKey}[${sectionIdx}]field[${fieldIdx}]option[${optIdx}]file`;
          return processOption(opt, fd, fileKey, assocType);
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
