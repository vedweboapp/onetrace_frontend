/**
 * Kiosk Checkout Payload Builders & Helpers
 * ──────────────────────────────────────────────────────────────────────────────
 * Converts kiosk configuration and user form answers into the checkout payload
 * expected by POST /api/v1/checkout/.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { KioskConfig, KioskQuestion, KioskOption } from "../types/kiosk.types";
import type {
  CheckoutItem,
  CheckoutValueItem,
  KioskCheckoutPayload,
} from "../types/kiosk-submission.types";
import type { KioskBillingDetails } from "../components/kiosk-invoice-details";
import type { LiveBuildScene } from "./kiosk-live-build";
import { getQuestionOptions } from "./kiosk-lookup";
import { applyColorFill } from "./kiosk-color-fill";
import { DEFAULT_PLACEMENT_COORDINATES } from "./kiosk-placement-styles";

export type KioskAnswerEntry = {
  uid?: string;
  o_id?: string;
  id?: string | number;
  value?: string | number;
  color?: string;
  label?: string;
  [key: string]: unknown;
};

export type KioskAnswerValue =
  | string
  | number
  | KioskAnswerEntry
  | Array<string | number | KioskAnswerEntry>
  | null
  | undefined;

/**
 * Returns options in the exact order they are displayed in the form.
 * For grouped questions, groups are displayed in sequence with their options.
 */
export function getDisplayedQuestionOptions(question: KioskQuestion): KioskOption[] {
  if (question.groups && question.groups.length > 0) {
    const groupedOptions = question.groups.flatMap((g) => g.options || []);
    const directOptions = (question.options || []).filter(
      (opt) => !groupedOptions.some((go) => (go.o_id || go.uid || go._uid) === (opt.o_id || opt.uid || opt._uid)),
    );
    return [...groupedOptions, ...directOptions];
  }
  return getQuestionOptions(question);
}

function parsePrice(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const cleaned = parseFloat(raw.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(cleaned) ? cleaned : 0;
  }
  return 0;
}

/**
 * Reads the price from a KioskOption, checking all known field name variants:
 * price, selling_price, unit_price, retail_price.
 */
function resolveRawPrice(option: KioskOption): number {
  const raw =
    option.price ??
    (option as any).selling_price ??
    (option as any).unit_price ??
    (option as any).retail_price;
  return parsePrice(raw);
}

function normalizeId(raw: unknown): number | string {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed !== "" && !isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    return trimmed;
  }
  return String(raw ?? "");
}

/**
 * Checks whether an option is selected within the raw answer value,
 * and extracts any user-provided value (e.g. input text or chosen color).
 */
function findOptionSelection(
  option: KioskOption,
  rawAnswer: KioskAnswerValue,
): { isSelected: boolean; value: string | number } {
  const optKeys = new Set<string>(
    [
      option.o_id,
      option.uid,
      option._uid,
      option.id != null ? String(option.id) : undefined,
    ]
      .filter((k): k is string => Boolean(k))
      .map(String),
  );

  const isColorSwatch = option.field_type === "color_swatch";

  /**
   * Prefer option.value (backend preset) as fallback.
   * For color swatches the preset lives in option.color — we intentionally
   * do NOT use option.color as the fallback here because the user's chosen
   * color is always stored explicitly as value/color in the answer entry.
   * Using option.color as fallback would silently replace the user's custom
   * choice with the preset whenever value is missing.
   */
  const fallbackValue: string | number =
    option.value ?? option.label ?? (option.id != null ? String(option.id) : "") ?? "";

  /**
   * Helper: extract the resolved value from a single answer entry object.
   * For color swatches: prefer entry.value (hex chosen by user), then entry.color.
   * For everything else: prefer entry.value, then option fallback.
   */
  function resolveEntryValue(entry: KioskAnswerEntry): string | number {
    if (isColorSwatch) {
      // entry.value and entry.color both hold the user-chosen hex string
      const v = entry.value;
      const c = entry.color;
      if (v !== undefined && v !== null && String(v).startsWith("#")) return String(v);
      if (c !== undefined && c !== null && String(c).startsWith("#")) return String(c);
      // last resort: any non-null stored value
      if (v !== undefined && v !== null) return v;
    }
    return entry.value !== undefined && entry.value !== null ? entry.value : fallbackValue;
  }

  if (rawAnswer == null) {
    return { isSelected: false, value: fallbackValue };
  }

  if (Array.isArray(rawAnswer)) {
    for (const item of rawAnswer) {
      if (item == null) continue;
      if (typeof item === "object") {
        const itemKey = item.uid ?? item.o_id ?? (item.id != null ? String(item.id) : undefined);
        if (itemKey != null && optKeys.has(String(itemKey))) {
          return { isSelected: true, value: resolveEntryValue(item as KioskAnswerEntry) };
        }
      } else {
        const itemStr = String(item);
        if (optKeys.has(itemStr) || itemStr === String(option.value) || itemStr === String(option.label)) {
          return { isSelected: true, value: fallbackValue };
        }
      }
    }
    return { isSelected: false, value: fallbackValue };
  }

  if (typeof rawAnswer === "object") {
    const itemKey = rawAnswer.uid ?? rawAnswer.o_id ?? (rawAnswer.id != null ? String(rawAnswer.id) : undefined);
    if (itemKey != null && optKeys.has(String(itemKey))) {
      return { isSelected: true, value: resolveEntryValue(rawAnswer as KioskAnswerEntry) };
    }
    return { isSelected: false, value: fallbackValue };
  }

  const rawStr = String(rawAnswer);
  if (optKeys.has(rawStr) || rawStr === String(option.value) || rawStr === String(option.label)) {
    return { isSelected: true, value: rawAnswer };
  }

  return { isSelected: false, value: fallbackValue };
}

/**
 * Builds the `items` array for the checkout payload:
 * - Checkboxes: one entry in `values` per selected option.
 * - Groups: one entry in `values` per selected option across groups.
 * - Single-select (radio/dropdown): exactly one entry in `values`.
 * - Deselected options are excluded.
 * - If nothing is selected, sends an empty `values: []`.
 * - Selection order strictly preserves the form display order.
 * - Each object in `values` has EXACTLY 4 keys: o_id, id, value, price.
 */
export function buildKioskCheckoutItems(
  config: KioskConfig,
  answers: Record<string, unknown>,
  scene?: LiveBuildScene,
): CheckoutItem[] {
  const activeQuestions = (config.questions ?? []).filter(
    (q) => q.is_deleted !== true,
  );

  // Build price map from scene summaries if available (guarantees consistency with UI/live build)
  const scenePriceByOptKey = new Map<string, number>();
  if (scene?.summaries) {
    for (const summary of scene.summaries) {
      const opt = summary.option;
      if (!opt) continue;
      const p = resolveRawPrice(opt);
      if (p > 0) {
        const keys = [
          opt.id != null ? String(opt.id) : null,
          opt.o_id != null ? String(opt.o_id) : null,
          opt.uid != null ? String(opt.uid) : null,
          opt._uid != null ? String(opt._uid) : null,
          opt.value != null ? String(opt.value) : null,
          opt.label != null ? String(opt.label) : null,
          (opt as any).composite_item_id != null ? String((opt as any).composite_item_id) : null,
        ].filter(Boolean) as string[];
        for (const k of keys) {
          scenePriceByOptKey.set(k, p);
        }
      }
    }
  }

  const items: CheckoutItem[] = [];

  for (const question of activeQuestions) {
    const qKey = question.api_name || question.q_id || question._uid || "";
    const rawAnswer = (answers[qKey] ??
      (question.q_id ? answers[question.q_id] : undefined) ??
      (question._uid ? answers[question._uid] : undefined)) as KioskAnswerValue;

    const rawQId = question.id ?? question.q_id ?? question._uid ?? "";
    const questionId = normalizeId(rawQId);

    const displayedOptions = getDisplayedQuestionOptions(question);
    const values: CheckoutValueItem[] = [];

    for (const option of displayedOptions) {
      if (option.is_deleted) continue;

      const { isSelected, value } = findOptionSelection(option, rawAnswer);
      if (!isSelected) continue;

      // Skip input fields that have empty values
      if (option.field_type === "input" && String(value).trim().length === 0) {
        continue;
      }

      let price = resolveRawPrice(option);

      const rawOptId = option.id ?? option.o_id ?? option.uid ?? option._uid ?? "";
      const optId = normalizeId(rawOptId);

      // If price resolved to 0, attempt fallback to scene.summaries price map
      if (price === 0 && scenePriceByOptKey.size > 0) {
        const candidateKeys = [
          optId != null ? String(optId) : null,
          rawOptId != null ? String(rawOptId) : null,
          value != null ? String(value) : null,
          option.value != null ? String(option.value) : null,
          option.label != null ? String(option.label) : null,
          (option as any).composite_item_id != null ? String((option as any).composite_item_id) : null,
        ].filter(Boolean) as string[];
        for (const ck of candidateKeys) {
          const sp = scenePriceByOptKey.get(ck);
          if (sp && sp > 0) {
            price = sp;
            break;
          }
        }
      }

      // Rule: Exactly four keys: o_id, id, value, price.
      values.push({
        o_id: optId,
        id: optId,
        value,
        price: Number(price.toFixed(2)),
      });
    }

    items.push({
      q_id: questionId,
      id: questionId,
      values,
    });
  }

  return items;
}

export interface BuildCheckoutPayloadParams {
  config: KioskConfig;
  answers: Record<string, unknown>;
  billingDetails: KioskBillingDetails;
  snapshotImage: string;
  organizationId?: number;
  kioskMachineId?: number;
  items?: CheckoutItem[];
  scene?: LiveBuildScene;
}

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
 * Builds the complete checkout payload conforming to POST /api/v1/checkout/ (JSON)
 */
export function buildKioskCheckoutPayload({
  config,
  answers,
  billingDetails,
  snapshotImage,
  organizationId,
  kioskMachineId,
  items: prebuiltItems,
  scene,
}: BuildCheckoutPayloadParams): KioskCheckoutPayload {
  let items = prebuiltItems && prebuiltItems.length > 0
    ? prebuiltItems
    : buildKioskCheckoutItems(config, answers, scene);

  // If any item in values has price === 0, attempt to enrich with scene summaries
  if (scene?.summaries && scene.summaries.length > 0) {
    const scenePriceByOptKey = new Map<string, number>();
    for (const summary of scene.summaries) {
      const opt = summary.option;
      if (!opt) continue;
      const p = resolveRawPrice(opt);
      if (p > 0) {
        const keys = [
          opt.id != null ? String(opt.id) : null,
          opt.o_id != null ? String(opt.o_id) : null,
          opt.uid != null ? String(opt.uid) : null,
          opt._uid != null ? String(opt._uid) : null,
          opt.value != null ? String(opt.value) : null,
          opt.label != null ? String(opt.label) : null,
          (opt as any).composite_item_id != null ? String((opt as any).composite_item_id) : null,
        ].filter(Boolean) as string[];
        for (const k of keys) {
          scenePriceByOptKey.set(k, p);
        }
      }
    }

    if (scenePriceByOptKey.size > 0) {
      items = items.map((item) => ({
        ...item,
        values: item.values.map((val) => {
          if (val.price === 0) {
            const candidates = [
              String(val.id),
              String(val.o_id),
              String(val.value),
            ];
            for (const cand of candidates) {
              const sp = scenePriceByOptKey.get(cand);
              if (sp && sp > 0) {
                return { ...val, price: Number(sp.toFixed(2)) };
              }
            }
          }
          return val;
        }),
      }));
    }
  }

  const rawOrg = organizationId ?? config.organization_id ?? config.organization?.id;
  const rawKiosk = kioskMachineId ?? config.id;

  const orgId = typeof rawOrg === "number" ? rawOrg : parseInt(String(rawOrg || 1), 10) || 1;
  const kioskId = typeof rawKiosk === "number" ? rawKiosk : parseInt(String(rawKiosk || 1), 10) || 1;

  return {
    organization_id: orgId,
    kiosk_machine_id: kioskId,
    customer: {
      full_name: billingDetails.fullName.trim(),
      email: billingDetails.email.trim(),
      phone: billingDetails.phone.trim(),
      company_name: billingDetails.companyName?.trim() || undefined,
      vat_registered: Boolean(billingDetails.vatRegistered),
      vat_number: billingDetails.vatRegistered && billingDetails.vatNumber
        ? billingDetails.vatNumber.trim()
        : undefined,
    },
    billing_address: {
      address_line1: billingDetails.addressLine1.trim(),
      address_line2: billingDetails.addressLine2?.trim() || undefined,
      city: billingDetails.city.trim(),
      postcode: billingDetails.postcode.trim(),
      country: "United Kingdom",
    },
    items,
    snapshot_image: snapshotImage,
  };
}

/**
 * Builds a multipart/form-data (FormData) checkout payload with ONE snapshot attached as a binary File/Blob.
 */
export function buildKioskCheckoutFormData(params: BuildCheckoutPayloadParams): FormData {
  const jsonPayload = buildKioskCheckoutPayload(params);
  const fd = new FormData();

  fd.append("organization_id", String(jsonPayload.organization_id));
  fd.append("kiosk_machine_id", String(jsonPayload.kiosk_machine_id));

  // Customer — individual bracket-notation fields only (no redundant full JSON blob)
  if (jsonPayload.customer.full_name) fd.append("customer[full_name]", jsonPayload.customer.full_name);
  if (jsonPayload.customer.email) fd.append("customer[email]", jsonPayload.customer.email);
  if (jsonPayload.customer.phone) fd.append("customer[phone]", jsonPayload.customer.phone);
  if (jsonPayload.customer.company_name) fd.append("customer[company_name]", jsonPayload.customer.company_name);
  fd.append("customer[vat_registered]", String(jsonPayload.customer.vat_registered));
  if (jsonPayload.customer.vat_number) fd.append("customer[vat_number]", jsonPayload.customer.vat_number);

  // Billing address — individual bracket-notation fields only (no redundant full JSON blob)
  if (jsonPayload.billing_address.address_line1) fd.append("billing_address[address_line1]", jsonPayload.billing_address.address_line1);
  if (jsonPayload.billing_address.address_line2) fd.append("billing_address[address_line2]", jsonPayload.billing_address.address_line2);
  if (jsonPayload.billing_address.city) fd.append("billing_address[city]", jsonPayload.billing_address.city);
  if (jsonPayload.billing_address.postcode) fd.append("billing_address[postcode]", jsonPayload.billing_address.postcode);
  if (jsonPayload.billing_address.country) fd.append("billing_address[country]", jsonPayload.billing_address.country);

  // Items list
  fd.append("items", JSON.stringify(jsonPayload.items));

  // Single Binary Snapshot attachment as Blob file
  const snapshotBlob = dataUrlToBlob(params.snapshotImage);
  if (snapshotBlob) {
    fd.append("snapshot_image", snapshotBlob, `snapshot-${jsonPayload.kiosk_machine_id || "product"}.png`);
  } else if (params.snapshotImage) {
    fd.append("snapshot_image", params.snapshotImage);
  }

  return fd;
}

/**
 * Captures a composed visual snapshot of the final live scene to a base64 PNG data URL.
 * Throws an explicit error if canvas context initialization or composition fails.
 */
export async function captureLiveBuildSnapshot(scene: LiveBuildScene): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window === "undefined" || typeof document === "undefined") {
        throw new Error("Browser window and document required for snapshot capture.");
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to initialize 2D canvas context for snapshot capture.");
      }

      const renderFallback = () => {
        try {
          canvas.width = 800;
          canvas.height = 600;
          ctx.fillStyle = scene.solidColor || "#ffffff";
          ctx.fillRect(0, 0, 800, 600);

          ctx.fillStyle = "#1e293b";
          ctx.font = "bold 20px sans-serif";
          ctx.fillText("Configured Product Preview", 40, 50);

          ctx.fillStyle = "#475569";
          ctx.font = "14px sans-serif";
          let y = 90;
          for (const s of scene.summaries.slice(0, 10)) {
            const label = s.option.label || "Selected Option";
            ctx.fillText(`${s.questionLabel}: ${label}`, 40, y);
            y += 28;
          }

          const dataUrl = canvas.toDataURL("image/png");
          if (!dataUrl || dataUrl === "data:," || dataUrl.length < 50) {
            throw new Error("Fallback snapshot image data URL is invalid.");
          }
          resolve(dataUrl);
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Failed to render fallback snapshot preview."));
        }
      };

      const processBaseImage = async (baseSrc: string) => {
        const baseImg = new Image();
        baseImg.crossOrigin = "anonymous";
        baseImg.onload = async () => {
          try {
            const width = baseImg.naturalWidth || baseImg.width || 800;
            const height = baseImg.naturalHeight || baseImg.height || 600;

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(baseImg, 0, 0, width, height);

            for (const overlay of scene.overlays) {
              if (!overlay.image) continue;
              let overlaySrc = overlay.image;
              if (overlay.color) {
                overlaySrc = await applyColorFill(overlay.image, overlay.color);
              }

              await new Promise<void>((resOverlay) => {
                const ovImg = new Image();
                ovImg.crossOrigin = "anonymous";
                ovImg.onload = () => {
                  const coords = overlay.coordinates || DEFAULT_PLACEMENT_COORDINATES;
                  const x = (coords.top_left.x / 100) * width;
                  const y = (coords.top_left.y / 100) * height;
                  const w = ((coords.bottom_right.x - coords.top_left.x) / 100) * width;
                  const h = ((coords.bottom_right.y - coords.top_left.y) / 100) * height;
                  ctx.drawImage(ovImg, x, y, w, h);
                  resOverlay();
                };
                ovImg.onerror = () => resOverlay();
                ovImg.src = overlaySrc;
              });
            }

            const dataUrl = canvas.toDataURL("image/png");
            if (!dataUrl || dataUrl === "data:," || dataUrl.length < 50) {
              throw new Error("Composed snapshot image data URL is invalid.");
            }
            resolve(dataUrl);
          } catch (compErr) {
            reject(compErr instanceof Error ? compErr : new Error("Failed during canvas snapshot composition."));
          }
        };

        baseImg.onerror = () => {
          // If base image cannot be loaded (e.g. cross-origin restriction), render structured fallback
          renderFallback();
        };

        baseImg.src = baseSrc;
      };

      if (scene.canvasImage || (scene.colorApply && scene.colorApply.sourceImage)) {
        const rawSource = scene.colorApply?.sourceImage || scene.canvasImage || "";
        if (scene.colorApply?.color && rawSource) {
          applyColorFill(rawSource, scene.colorApply.color)
            .then(processBaseImage)
            .catch(() => processBaseImage(rawSource));
        } else {
          void processBaseImage(rawSource);
        }
      } else if (scene.solidColor) {
        canvas.width = 800;
        canvas.height = 600;
        ctx.fillStyle = scene.solidColor;
        ctx.fillRect(0, 0, 800, 600);

        (async () => {
          try {
            for (const overlay of scene.overlays) {
              if (!overlay.image) continue;
              let overlaySrc = overlay.image;
              if (overlay.color) {
                overlaySrc = await applyColorFill(overlay.image, overlay.color);
              }
              await new Promise<void>((resOverlay) => {
                const ovImg = new Image();
                ovImg.crossOrigin = "anonymous";
                ovImg.onload = () => {
                  const coords = overlay.coordinates || DEFAULT_PLACEMENT_COORDINATES;
                  const x = (coords.top_left.x / 100) * 800;
                  const y = (coords.top_left.y / 100) * 600;
                  const w = ((coords.bottom_right.x - coords.top_left.x) / 100) * 800;
                  const h = ((coords.bottom_right.y - coords.top_left.y) / 100) * 600;
                  ctx.drawImage(ovImg, x, y, w, h);
                  resOverlay();
                };
                ovImg.onerror = () => resOverlay();
                ovImg.src = overlaySrc;
              });
            }
            const dataUrl = canvas.toDataURL("image/png");
            if (!dataUrl || dataUrl === "data:," || dataUrl.length < 50) {
              throw new Error("Solid color snapshot data URL is invalid.");
            }
            resolve(dataUrl);
          } catch (err) {
            reject(err instanceof Error ? err : new Error("Failed to compose solid-color snapshot."));
          }
        })();
      } else {
        renderFallback();
      }
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Failed to capture kiosk snapshot image."));
    }
  });
}
