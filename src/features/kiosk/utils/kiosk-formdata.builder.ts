import type { KioskConfig, KioskGroup, KioskOption, KioskQuestion } from "../types/kiosk.types";

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

/**
 * Appends an option's attributes to a FormData object at a given key prefix
 */
function appendOptionToFormData(
  fd: FormData,
  prefix: string,
  option: KioskOption,
  optIndex: number,
  gid?: string,
) {
  fd.append(`${prefix}[uid]`, option.uid || option._uid || `opt_${optIndex}`);
  fd.append(`${prefix}[sequence]`, String(optIndex));
  fd.append(`${prefix}[order]`, String(optIndex));

  if (option.id != null) {
    fd.append(`${prefix}[id]`, String(option.id));
  }
  if (gid) {
    fd.append(`${prefix}[gid]`, gid);
  }
  if (option.field_type) {
    fd.append(`${prefix}[field_type]`, option.field_type);
  }
  if (option.label != null) {
    fd.append(`${prefix}[label]`, option.label);
  }
  if (option.subLabel != null) {
    fd.append(`${prefix}[subLabel]`, option.subLabel);
  }
  if (option.api_name != null) {
    fd.append(`${prefix}[api_name]`, option.api_name);
  }
  if (option.value != null) {
    fd.append(`${prefix}[value]`, String(option.value));
  }
  if (option.price != null && option.price !== "") {
    fd.append(`${prefix}[price]`, String(option.price));
  }
  if (option.required != null) {
    fd.append(`${prefix}[required]`, String(Boolean(option.required)));
  }
  if (option.placeholder != null) {
    fd.append(`${prefix}[placeholder]`, option.placeholder);
  }
  if (option.input_type != null) {
    fd.append(`${prefix}[input_type]`, option.input_type);
  }
  if (option.color != null) {
    fd.append(`${prefix}[color]`, option.color);
  }
  if (option.fill_color != null) {
    fd.append(`${prefix}[fill_color]`, option.fill_color);
  }

  // Image Radio Placement Attributes
  if (option.field_type === "image_radio") {
    if (option.placement_mode) {
      fd.append(`${prefix}[placement_mode]`, option.placement_mode);
    }
    if (option.placement_position) {
      fd.append(`${prefix}[placement_position]`, option.placement_position);
    }
    if (option.placement?.target_field) {
      fd.append(`${prefix}[target_image_field]`, option.placement.target_field);
    }
    const placementTargets = Array.isArray(option.placement_targets)
      ? option.placement_targets
      : Array.isArray(option.placement?.target_fields)
      ? option.placement.target_fields
      : [];
    placementTargets.forEach((target, tIdx) => {
      if (target) {
        fd.append(`${prefix}[placement_targets][${tIdx}]`, target);
        fd.append(`${prefix}[placement][target_fields][${tIdx}]`, target);
      }
    });
    const placementTargetQuestion =
      option.placement_target_question || option.placement?.target_question;
    if (placementTargetQuestion) {
      fd.append(`${prefix}[placement_target_question]`, placementTargetQuestion);
      fd.append(`${prefix}[placement][target_question]`, placementTargetQuestion);
    }
  }

  // Color Fill Targets
  if (option.field_type === "color" || option.field_type === "color_swatch") {
    if (Array.isArray(option.fill_targets) && option.fill_targets.length > 0) {
      option.fill_targets.forEach((target, tIdx) => {
        fd.append(`${prefix}[fill_targets][${tIdx}]`, target);
      });
    }
    if (option.target_image_field) {
      fd.append(`${prefix}[target_image_field]`, option.target_image_field);
    }
    if (option.fill_target_question) {
      fd.append(`${prefix}[fill_target_question]`, option.fill_target_question);
    }
  }

  // Handle Image File / Data URL / URL
  if (option.image) {
    if (typeof option.image === "string" && option.image.startsWith("data:")) {
      const blob = dataUrlToBlob(option.image);
      if (blob) {
        const ext = blob.type.split("/")[1] || "png";
        fd.append(
          `${prefix}[image]`,
          blob,
          `${option.uid || `option_${optIndex}`}.${ext}`,
        );
      } else {
        fd.append(`${prefix}[image]`, option.image);
      }
    } else if (typeof option.image === "object" && (option.image as any) instanceof Blob) {
      fd.append(`${prefix}[image]`, option.image as any);
    } else if (typeof option.image === "string") {
      fd.append(`${prefix}[image]`, option.image);
    }
  }

  // Fill Image for Color Swatches (if any)
  if (option.fill_image) {
    if (typeof option.fill_image === "string" && option.fill_image.startsWith("data:")) {
      const blob = dataUrlToBlob(option.fill_image);
      if (blob) {
        const ext = blob.type.split("/")[1] || "png";
        fd.append(
          `${prefix}[fill_image]`,
          blob,
          `${option.uid || `option_${optIndex}`}_fill.${ext}`,
        );
      } else {
        fd.append(`${prefix}[fill_image]`, option.fill_image);
      }
    } else if (typeof option.fill_image === "object" && (option.fill_image as any) instanceof Blob) {
      fd.append(`${prefix}[fill_image]`, option.fill_image as any);
    } else if (typeof option.fill_image === "string") {
      fd.append(`${prefix}[fill_image]`, option.fill_image);
    }
  }
}

/**
 * Builds a multipart FormData payload from a KioskConfig object
 * Structured as:
 * - When question has groups:
 *   questions[qIndex][groups][gIndex][options][optIndex]
 * - When question has no groups:
 *   questions[qIndex][options][optIndex]
 */
export function buildKioskFormData(config: KioskConfig): FormData {
  const fd = new FormData();

  if (config.id != null) {
    fd.append("id", String(config.id));
  }
  if (config.name != null) {
    fd.append("name", config.name);
  }
  if (config.api_name != null) {
    fd.append("api_name", config.api_name);
  }
  if (config.description != null) {
    fd.append("description", config.description);
  }
  if (config.is_active != null) {
    fd.append("is_active", String(Boolean(config.is_active)));
  }
  if (config.submitting) {
    if (config.submitting.heading) {
      fd.append("submitting[heading]", config.submitting.heading);
    }
    if (config.submitting.subheading) {
      fd.append("submitting[subheading]", config.submitting.subheading);
    }
    if (config.submitting.button_text) {
      fd.append("submitting[button_text]", config.submitting.button_text);
    }
    if (config.submitting.redirect_url) {
      fd.append("submitting[redirect_url]", config.submitting.redirect_url);
    }
  }

  const questions = config.questions || [];

  questions.forEach((q, qIndex) => {
    const qPrefix = `questions[${qIndex}]`;
    const qId = q.q_id || q._uid || `q_${qIndex}`;

    fd.append(`${qPrefix}[q_id]`, qId);
    fd.append(`${qPrefix}[sequence]`, String(qIndex));
    fd.append(`${qPrefix}[order]`, String(qIndex));

    if (q.id != null) {
      fd.append(`${qPrefix}[id]`, String(q.id));
    }
    if (q.label != null) {
      fd.append(`${qPrefix}[label]`, q.label);
    }
    if (q.subLabel != null) {
      fd.append(`${qPrefix}[subLabel]`, q.subLabel);
    }
    if (q.api_name != null) {
      fd.append(`${qPrefix}[api_name]`, q.api_name);
    }
    if (q.columns != null) {
      fd.append(`${qPrefix}[columns]`, String(q.columns));
    }
    if (q.column_count != null) {
      fd.append(`${qPrefix}[column_count]`, String(q.column_count));
    }

    const hasGroups = q.groups && q.groups.length > 0;

    if (hasGroups) {
      // ── Grouped Question: questions[qIndex][groups][gIndex][options][optIndex] ──
      q.groups!.forEach((g, gIndex) => {
        const gPrefix = `${qPrefix}[groups][${gIndex}]`;
        const gId = g.gid || g._uid || `gid_${gIndex}`;

        fd.append(`${gPrefix}[gid]`, gId);
        fd.append(`${gPrefix}[sequence]`, String(gIndex));
        fd.append(`${gPrefix}[order]`, String(gIndex));

        if (g.id != null) {
          fd.append(`${gPrefix}[id]`, String(g.id));
        }
        if (g.name != null) {
          fd.append(`${gPrefix}[name]`, g.name);
        }
        if (g.description != null) {
          fd.append(`${gPrefix}[description]`, g.description);
        }
        if (g.columns != null) {
          fd.append(`${gPrefix}[columns]`, String(g.columns));
        }

        const gOptions = g.options || [];
        gOptions.forEach((opt, optIndex) => {
          const optPrefix = `${gPrefix}[options][${optIndex}]`;
          appendOptionToFormData(fd, optPrefix, opt, optIndex, gId);
        });
      });
    } else {
      // ── Ungrouped Question: questions[qIndex][options][optIndex] ──
      const options = q.options || [];
      options.forEach((opt, optIndex) => {
        const optPrefix = `${qPrefix}[options][${optIndex}]`;
        appendOptionToFormData(fd, optPrefix, opt, optIndex);
      });
    }
  });

  return fd;
}

/**
 * Returns a debug representation of a FormData object for logging
 */
export function formDataToDebugEntries(fd: FormData): Record<string, any> {
  const result: Record<string, any> = {};
  fd.forEach((val, key) => {
    if ((val as any) instanceof File) {
      result[key] = `[File: ${(val as File).name} (${(val as File).type}, ${(val as File).size} bytes)]`;
    } else if ((val as any) instanceof Blob) {
      result[key] = `[Blob: ${(val as Blob).type} (${(val as Blob).size} bytes)]`;
    } else {
      result[key] = val;
    }
  });
  return result;
}
