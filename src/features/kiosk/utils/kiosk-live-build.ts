import type {
  KioskConfig,
  KioskOption,
  KioskQuestion,
  PositionValue,
} from "../types/kiosk.types";

export type KioskAnswerValue =
  | { uid: string; value?: string | number }
  | { uid: string; value?: string | number }[]
  | string
  | undefined;

export interface LiveBuildOverlay {
  image: string;
  position: PositionValue;
  label?: string;
  targetUid?: string | null;
  targetUids?: string[];
}

export interface LiveBuildColorApply {
  sourceImage: string;
  color: string;
  targetUid?: string | null;
}

export interface LiveBuildSelectionSummary {
  questionLabel: string;
  option: KioskOption;
  resolvedColor?: string;
}

export interface LiveBuildScene {
  hasVisual: boolean;
  canvasUid: string | null;
  canvasImage: string | null;
  solidColor: string | null;
  colorApply: LiveBuildColorApply | null;
  overlays: LiveBuildOverlay[];
  summaries: LiveBuildSelectionSummary[];
  checkboxFeatures: string[];
  totalPrice: number;
}

function getAllQuestionOptions(q: KioskQuestion): KioskOption[] {
  const seen = new Set<string>();
  const all: KioskOption[] = [];
  const pushOpt = (opt: KioskOption) => {
    if (!opt) return;
    const key = opt.uid || opt._uid;
    if (key) {
      if (!seen.has(key)) {
        seen.add(key);
        all.push(opt);
      }
    } else {
      all.push(opt);
    }
  };

  for (const opt of q.options || []) {
    pushOpt(opt);
  }
  if (q.groups) {
    for (const g of q.groups) {
      for (const opt of g.options || []) {
        pushOpt(opt);
      }
    }
  }
  return all;
}

function buildOptionIndex(questions: KioskQuestion[]): Map<string, KioskOption> {
  const map = new Map<string, KioskOption>();
  for (const q of questions) {
    for (const opt of getAllQuestionOptions(q)) {
      const id = opt.uid || opt._uid;
      if (id) map.set(id, opt);
    }
  }
  return map;
}

function resolveSelectedOption(
  question: KioskQuestion,
  answers: Record<string, KioskAnswerValue>,
  draft?: KioskOption | null,
): KioskOption | null {
  if (draft) return draft;
  const qKey = question.api_name || question.q_id || question._uid || "";
  const ans = answers[qKey];
  const options = getAllQuestionOptions(question);
  if (!ans) return null;

  // Array answer: happens when input fields co-exist with single-choice options.
  // Look for the first non-input uid entry.
  if (Array.isArray(ans)) {
    for (const entry of ans) {
      const uid = typeof entry === "object" && entry?.uid ? entry.uid : entry;
      const opt = options.find((o) => (o.uid || o._uid) === uid);
      if (opt && opt.field_type !== "input") return opt;
    }
    return null;
  }

  if (typeof ans === "object" && ans !== null && "uid" in ans) {
    return options.find((o) => (o.uid || o._uid) === ans.uid) ?? null;
  }

  const key = typeof ans === "string" ? ans : String(ans);
  return (
    options.find((o) => (o.uid || o._uid) === key || o.value === key || o.label === key) ??
    null
  );
}

function resolveCheckboxSelections(
  question: KioskQuestion,
  answers: Record<string, KioskAnswerValue>,
): KioskOption[] {
  const qKey = question.api_name || question.q_id || question._uid || "";
  const ans = answers[qKey];
  if (!Array.isArray(ans)) return [];
  const options = getAllQuestionOptions(question);
  return ans
    .map((entry) => {
      const uid = typeof entry === "object" && entry?.uid ? entry.uid : entry;
      const opt = options.find((o) => (o.uid || o._uid) === uid);
      return opt && opt.field_type !== "input" ? opt : null;
    })
    .filter(Boolean) as KioskOption[];
}

function resolveInputSelections(
  question: KioskQuestion,
  answers: Record<string, KioskAnswerValue>,
): { option: KioskOption; value: string }[] {
  const qKey = question.api_name || question.q_id || question._uid || "";
  const ans = answers[qKey];
  const options = getAllQuestionOptions(question);
  const results: { option: KioskOption; value: string }[] = [];

  if (Array.isArray(ans)) {
    for (const entry of ans) {
      if (typeof entry === "object" && entry?.uid) {
        const opt = options.find((o) => (o.uid || o._uid) === entry.uid && o.field_type === "input");
        if (opt && String(entry.value ?? "").trim().length > 0) {
          results.push({ option: opt, value: String(entry.value) });
        }
      }
    }
  } else if (typeof ans === "object" && ans !== null && "uid" in ans) {
    const opt = options.find((o) => (o.uid || o._uid) === (ans as any).uid && o.field_type === "input");
    if (opt && String((ans as any).value ?? "").trim().length > 0) {
      results.push({ option: opt, value: String((ans as any).value) });
    }
  }

  return results;
}

function resolveOptionColor(
  option: KioskOption,
  question: KioskQuestion,
  answers: Record<string, KioskAnswerValue>,
): string {
  const qKey = question.api_name || question.q_id || question._uid || "";
  const ans = answers[qKey];
  const optUid = option.uid || option._uid;
  if (
    typeof ans === "object" &&
    ans !== null &&
    !Array.isArray(ans) &&
    ans.uid === optUid &&
    typeof ans.value === "string" &&
    ans.value.startsWith("#")
  ) {
    return ans.value;
  }
  return String(option.color || option.fill_color || option.value || "#2563EB");
}

function isPlaceMode(option: KioskOption): boolean {
  const mode = option.placement_mode || option.placement?.mode;
  return mode === "place";
}

function isColorType(option: KioskOption): boolean {
  return option.field_type === "color" || option.field_type === "color_swatch";
}

function parsePrice(price: KioskOption["price"]): number {
  if (price == null || price === "") return 0;
  const n = parseFloat(String(price).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function getTargetOptionUids(
  colorOption: KioskOption,
  questions: KioskQuestion[],
): string[] {
  const targets = new Set<string>();
  if (Array.isArray(colorOption.fill_targets)) {
    for (const uid of colorOption.fill_targets) {
      if (uid) targets.add(uid);
    }
  }
  if (colorOption.fill_target_question) {
    const q = questions.find((item) => (item.q_id || item._uid) === colorOption.fill_target_question);
    if (q) {
      for (const opt of getAllQuestionOptions(q)) {
        const optId = opt.uid || opt._uid;
        if (opt.image && optId) targets.add(optId);
      }
    }
  }
  if (colorOption.target_image_field) {
    targets.add(colorOption.target_image_field);
  }
  if (colorOption.placement?.target_field) {
    targets.add(colorOption.placement.target_field);
  }
  return Array.from(targets);
}

export function getPlacementTargetOptionUids(
  option: KioskOption,
  questions: KioskQuestion[],
): string[] {
  const targets = new Set<string>();
  if (Array.isArray(option.placement_targets)) {
    for (const uid of option.placement_targets) {
      if (uid) targets.add(uid);
    }
  }
  if (Array.isArray(option.placement?.target_fields)) {
    for (const uid of option.placement.target_fields) {
      if (uid) targets.add(uid);
    }
  }
  const targetQ = option.placement_target_question || option.placement?.target_question;
  if (targetQ) {
    const q = questions.find((item) => (item.q_id || item._uid) === targetQ);
    if (q) {
      for (const opt of getAllQuestionOptions(q)) {
        const optId = opt.uid || opt._uid;
        if (opt.image && optId) targets.add(optId);
      }
    }
  }
  if (option.target_image_field) {
    targets.add(option.target_image_field);
  }
  if (option.placement?.target_field) {
    targets.add(option.placement.target_field);
  }
  return Array.from(targets);
}

export function computeLiveBuildScene(
  config: KioskConfig,
  answers: Record<string, KioskAnswerValue>,
  livePreviewOptions?: Record<string, KioskOption | null | undefined>,
): LiveBuildScene {
  const questions = (config.questions ?? []).filter((q) => q.is_deleted !== true);
  const optionByUid = buildOptionIndex(questions);

  let canvasUid: string | null = null;
  let canvasImage: string | null = null;
  let canvasQuestion: KioskQuestion | null = null;
  let solidColor: string | null = null;
  let colorApply: LiveBuildColorApply | null = null;
  const overlays: LiveBuildOverlay[] = [];
  const summaries: LiveBuildSelectionSummary[] = [];
  const checkboxFeatures: string[] = [];
  let totalPrice = 0;

  interface SelectedItem {
    question: KioskQuestion;
    selected: KioskOption;
    resolvedColor?: string;
  }

  const selectedItems: SelectedItem[] = [];

  // Pass 1: Collect active selections, prices, and summaries
  for (const question of questions) {
    const qId = question.q_id || question._uid || "";
    const draft = livePreviewOptions?.[qId];
    const selected = resolveSelectedOption(question, answers, draft ?? undefined);
    const checkboxes = resolveCheckboxSelections(question, answers);

    for (const cb of checkboxes) {
      if (cb.label) checkboxFeatures.push(cb.label);
      totalPrice += parsePrice(cb.price);
    }

    const inputs = resolveInputSelections(question, answers);
    for (const inp of inputs) {
      totalPrice += parsePrice(inp.option.price);
      summaries.push({
        questionLabel: inp.option.label || "Input",
        option: inp.option,
      });
    }

    if (!selected) continue;

    totalPrice += parsePrice(selected.price);

    const resolvedColor = isColorType(selected)
      ? resolveOptionColor(selected, question, answers)
      : undefined;

    summaries.push({
      questionLabel: question.label || "Option",
      option: selected,
      resolvedColor,
    });

    selectedItems.push({ question, selected, resolvedColor });
  }

  // Pass 2: Resolve the base canvas image from user selections
  for (const { question, selected } of selectedItems) {
    if (selected.field_type === "image_radio" && isPlaceMode(selected)) {
      continue; // overlays handled below
    }
    if (selected.image) {
      canvasUid = selected.uid || selected._uid || null;
      canvasImage = String(selected.image);
      canvasQuestion = question;
    }
  }

  // Pass 3: Resolve place-mode overlays
  for (const { selected } of selectedItems) {
    if (selected.field_type === "image_radio" && isPlaceMode(selected) && selected.image) {
      const targetUids = getPlacementTargetOptionUids(selected, questions);
      const primaryTargetUid = targetUids[0] || selected.target_image_field || selected.placement?.target_field || null;

      if (!canvasImage && targetUids.length > 0) {
        for (const tUid of targetUids) {
          const targetOpt = optionByUid.get(tUid);
          if (targetOpt?.image) {
            canvasUid = tUid;
            canvasImage = String(targetOpt.image);
            break;
          }
        }
      }

      const position: PositionValue =
        selected.placement_position ||
        selected.placement?.position ||
        "center";

      overlays.push({
        image: String(selected.image),
        position,
        label: selected.label || undefined,
        targetUid: primaryTargetUid,
        targetUids,
      });
    }
  }

  // Pass 4: Evaluate color fill — only applies to the CURRENTLY SELECTED image
  for (const { selected, resolvedColor } of selectedItems) {
    if (!isColorType(selected)) continue;

    const chosenColor = resolvedColor || "#2563EB";

    // Color fill only applies if a base canvas image is ACTUALLY SELECTED
    if (canvasUid && canvasImage) {
      const targets = getTargetOptionUids(selected, questions);
      const isTargeted =
        targets.includes(canvasUid) ||
        (selected.fill_target_question &&
          (canvasQuestion?.q_id || canvasQuestion?._uid) === selected.fill_target_question);

      if (isTargeted) {
        colorApply = {
          sourceImage: canvasImage,
          color: chosenColor,
          targetUid: canvasUid,
        };
      }
    }

    // If no canvas image is selected or the selected image is not targeted,
    // show solid color block only. We NEVER spawn an unselected image!
    if (!colorApply) {
      solidColor = chosenColor;
    }
  }

  const filteredOverlays = overlays.filter((layer) => {
    if (!canvasUid) return true;
    if (!layer.targetUids || layer.targetUids.length === 0) return true;
    return layer.targetUids.includes(canvasUid);
  });

  const hasVisual =
    !!canvasImage ||
    !!solidColor ||
    !!colorApply ||
    filteredOverlays.length > 0;

  return {
    hasVisual,
    canvasUid,
    canvasImage,
    solidColor,
    colorApply,
    overlays: filteredOverlays,
    summaries,
    checkboxFeatures,
    totalPrice,
  };
}
