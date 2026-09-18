/**
 * buildKioskSubmissionPayload
 * ──────────────────────────────────────────────────────────────────────────────
 * Converts the raw `answers` state from KioskRenderer into the structured
 * KioskSubmissionPayload ready to POST to the backend.
 *
 * Usage in KioskRenderer:
 *   const payload = buildKioskSubmissionPayload(config, answers);
 *   await api.post("/kiosks/submissions/", payload);
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { KioskConfig, KioskQuestion, KioskOption } from "../types/kiosk.types";
import type {
  KioskSubmissionPayload,
  KioskResponseItem,
  KioskSelectedOption,
  KioskSubmissionSummaryItem,
} from "../types/kiosk-submission.types";

// ── Internal answer shapes produced by KioskRenderer ─────────────────────────

interface RawSingleAnswer {
  uid: string;
  value: string | number;
}

type RawAnswer = RawSingleAnswer | RawSingleAnswer[];

// ── Helper: resolve an option into a KioskSelectedOption ─────────────────────

function resolveSelectedOption(
  option: KioskOption,
  rawValue: string | number,
): KioskSelectedOption {
  const fieldType = (option.field_type as string) || "radio";
  const isColor = fieldType === "color" || fieldType === "color_swatch";
  const isImageRadio = fieldType === "image_radio";

  const placementMode =
    option.placement_mode ||
    (option.placement?.mode as "place" | "group" | undefined) ||
    null;

  const placementPosition =
    option.placement_position ||
    (option.placement?.position as
      | "top"
      | "bottom"
      | "left"
      | "right"
      | "center"
      | undefined) ||
    null;

  const placementTargetUid =
    option.target_image_field ||
    (option.placement?.target_field as string | undefined) ||
    null;
  const placementTargetUids = [
    ...(Array.isArray(option.placement_targets) ? option.placement_targets : []),
    ...(Array.isArray(option.placement?.target_fields) ? option.placement.target_fields : []),
    ...(placementTargetUid ? [placementTargetUid] : []),
  ].filter((uid, index, arr): uid is string => Boolean(uid) && arr.indexOf(uid) === index);

  return {
    option_uid: option.uid || option._uid || "",
    option_id: option.id ?? null,
    option_api_name: option.api_name || "",
    option_label: option.label || "",
    value: rawValue,
    price: parseFloat(String(option.price || 0)) || 0,

    // Color extras
    color: isColor
      ? String(typeof rawValue === "string" ? rawValue : option.color || option.value || "")
      : null,

    // Image extras
    image_url: isImageRadio && option.image ? String(option.image) : null,

    // Placement extras (image_radio only)
    placement_mode: isImageRadio ? placementMode : null,
    placement_position: isImageRadio && placementMode === "place" ? placementPosition : null,
    placement_target_uid: isImageRadio && placementMode === "place" ? placementTargetUid : null,
    placement_target_uids:
      isImageRadio && placementMode === "place" && placementTargetUids.length > 0
        ? placementTargetUids
        : null,

    // Group & Input extras
    group_uid: option.gid || option.group_uid || null,
    group_name: option.group_name || null,
    input_type: option.input_type || null,
    placeholder: option.placeholder || null,
  };
}

// ── Build a flat option map for fast lookup ───────────────────────────────────

function buildOptionMap(
  questions: KioskQuestion[],
): Map<string, { option: KioskOption; question: KioskQuestion }> {
  const map = new Map<string, { option: KioskOption; question: KioskQuestion }>();
  questions.forEach((q) => {
    const allOptions = [
      ...(q.options || []),
      ...(q.groups || []).flatMap((g) => g.options || []),
    ];
    allOptions.forEach((opt) => {
      const optId = opt.uid || opt._uid;
      if (optId) map.set(optId, { option: opt, question: q });
    });
  });
  return map;
}

// ── Determine dominant field_type for a question ─────────────────────────────

function getQuestionFieldType(question: KioskQuestion): string {
  const options = [
    ...(question.options || []),
    ...(question.groups || []).flatMap((g) => g.options || []),
  ];
  if (options.length === 0) return "radio";
  // Use the first non-deleted option's field_type as the question's type
  const first = options.find((o) => !o.is_deleted);
  return (first?.field_type as string) || "radio";
}

// ── Main builder function ─────────────────────────────────────────────────────

export function buildKioskSubmissionPayload(
  config: KioskConfig,
  answers: Record<string, RawAnswer>,
): KioskSubmissionPayload {
  const activeQuestions = (config.questions ?? []).filter(
    (q) => q.is_deleted !== true,
  );

  const optionMap = buildOptionMap(activeQuestions);
  const responses: KioskResponseItem[] = [];
  const summary: KioskSubmissionSummaryItem[] = [];
  let totalPrice = 0;

  for (const question of activeQuestions) {
    const qKey = question.api_name || question.q_id || question._uid || "";
    const rawAnswer: RawAnswer | undefined = answers[qKey];
    const fieldType = getQuestionFieldType(question);
    const isCheckbox = fieldType === "checkbox";
    const allOpts = [
      ...(question.options || []),
      ...(question.groups || []).flatMap((g) => g.options || []),
    ];
    const hasInputs = allOpts.some((o) => o.field_type === "input");
    const inputValues: Record<string, string | number> = {};

    let selectedOption: KioskSelectedOption | null = null;
    const selectedOptions: KioskSelectedOption[] = [];
    let subtotal = 0;

    if (rawAnswer != null) {
      if (Array.isArray(rawAnswer)) {
        // ── Array of answers: Checkboxes and/or multiple Input fields ────────
        for (const entry of rawAnswer) {
          const found = optionMap.get(entry.uid);
          if (found) {
            const sel = resolveSelectedOption(found.option, entry.value);
            if (found.option.field_type === "input") {
              const valStr = String(entry.value ?? "").trim();
              if (valStr.length > 0) {
                sel.value = entry.value;
                selectedOptions.push(sel);
                subtotal += sel.price;
                inputValues[found.option.api_name || found.option.uid || found.option._uid || ""] = entry.value;
              }
            } else if (isCheckbox) {
              selectedOptions.push(sel);
              subtotal += sel.price;
            } else {
              selectedOption = sel;
              subtotal += sel.price;
            }
          }
        }
      } else if (!Array.isArray(rawAnswer) && rawAnswer.uid) {
        // ── Single select or single input ────────────────────────────────────
        const found = optionMap.get(rawAnswer.uid);
        if (found) {
          if (found.option.field_type === "input") {
            const valStr = String(rawAnswer.value ?? "").trim();
            if (valStr.length > 0) {
              const sel = resolveSelectedOption(found.option, rawAnswer.value);
              selectedOptions.push(sel);
              subtotal = sel.price;
              inputValues[found.option.api_name || found.option.uid || found.option._uid || ""] = rawAnswer.value;
            }
          } else {
            selectedOption = resolveSelectedOption(found.option, rawAnswer.value);
            subtotal = selectedOption.price;
          }
        }
      }
    }

    totalPrice += subtotal;

    const isAnswered =
      isCheckbox || hasInputs ? selectedOptions.length > 0 : selectedOption !== null;

    // Resolve group summaries if question has groups
    const questionGroups = question.groups || [];
    const resolvedGroupsPayload = questionGroups.map((g) => {
      const gOptionUids = new Set((g.options || []).map((o) => o.uid || o._uid));
      const gSelected = selectedOptions.filter((s) => gOptionUids.has(s.option_uid));
      const gInputs: Record<string, string | number> = {};
      gSelected
        .filter((s) => optionMap.get(s.option_uid)?.option.field_type === "input")
        .forEach((s) => {
          gInputs[s.option_api_name || s.option_uid] = s.value;
        });
      return {
        group_uid: g.gid || g._uid || "",
        group_name: g.name,
        selected_options: gSelected,
        input_values: Object.keys(gInputs).length > 0 ? gInputs : undefined,
      };
    });

    const responseItem: KioskResponseItem = {
      question_uid: question.q_id || question._uid || "",
      question_id: question.id ?? null,
      question_api_name: qKey,
      question_label: question.label || "",
      field_type: hasInputs ? "input" : fieldType,
      selected_option: isCheckbox || hasInputs ? null : selectedOption,
      selected_options: isCheckbox || hasInputs ? selectedOptions : [],
      input_values: Object.keys(inputValues).length > 0 ? inputValues : undefined,
      groups: resolvedGroupsPayload.length > 0 ? resolvedGroupsPayload : undefined,
      subtotal: parseFloat(subtotal.toFixed(2)),
      is_answered: isAnswered,
    };

    responses.push(responseItem);

    // ── Build flat summary entry ──────────────────────────────────────────────
    if (isAnswered) {
      if (hasInputs) {
        for (const s of selectedOptions) {
          summary.push({
            question_api_name: qKey,
            question_label: question.label || "",
            field_type: "input",
            value_label: s.option_label,
            value: String(s.value),
            price: s.price,
          });
        }
      } else {
        const allSel = isCheckbox ? selectedOptions : selectedOption ? [selectedOption] : [];
        summary.push({
          question_api_name: qKey,
          question_label: question.label || "",
          field_type: fieldType,
          value_label: allSel.map((s) => s.option_label).join(", "),
          value: allSel.map((s) => String(s.value)).join(", "),
          price: parseFloat(subtotal.toFixed(2)),
        });
      }
    }
  }

  return {
    kiosk_id: config.id ?? null,
    kiosk_api_name: config.api_name || "",
    kiosk_name: config.name || "",
    submitted_at: new Date().toISOString(),
    responses,
    total_price: parseFloat(totalPrice.toFixed(2)),
    summary,
  };
}
