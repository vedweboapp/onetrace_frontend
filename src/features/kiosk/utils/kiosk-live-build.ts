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

function buildOptionIndex(questions: KioskQuestion[]): Map<string, KioskOption> {
  const map = new Map<string, KioskOption>();
  for (const q of questions) {
    for (const opt of q.options || []) {
      if (opt._uid) map.set(opt._uid, opt);
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
  const qKey = question.api_name || question._uid;
  const ans = answers[qKey];
  const options = question.options || [];
  if (!ans) return null;

  if (Array.isArray(ans)) return null;

  if (typeof ans === "object" && ans !== null && "uid" in ans) {
    return options.find((o) => o._uid === ans.uid) ?? null;
  }

  const key = typeof ans === "string" ? ans : String(ans);
  return (
    options.find((o) => o._uid === key || o.value === key || o.label === key) ??
    null
  );
}

function resolveCheckboxSelections(
  question: KioskQuestion,
  answers: Record<string, KioskAnswerValue>,
): KioskOption[] {
  const qKey = question.api_name || question._uid;
  const ans = answers[qKey];
  if (!Array.isArray(ans)) return [];
  const options = question.options || [];
  return ans
    .map((entry) => {
      const uid = typeof entry === "object" && entry?.uid ? entry.uid : entry;
      return options.find((o) => o._uid === uid) ?? null;
    })
    .filter(Boolean) as KioskOption[];
}

function resolveOptionColor(
  option: KioskOption,
  question: KioskQuestion,
  answers: Record<string, KioskAnswerValue>,
): string {
  const qKey = question.api_name || question._uid;
  const ans = answers[qKey];
  if (
    typeof ans === "object" &&
    ans !== null &&
    !Array.isArray(ans) &&
    ans.uid === option._uid &&
    typeof ans.value === "string" &&
    ans.value.startsWith("#")
  ) {
    return ans.value;
  }
  return String(option.color || option.fill_color || option.value || "#2563EB");
}

function isPlaceMode(option: KioskOption): boolean {
  const mode = option.placement_mode || option.placement?.mode || "group";
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
    const q = questions.find((item) => item._uid === colorOption.fill_target_question);
    if (q) {
      for (const opt of q.options || []) {
        if (opt.image && opt._uid) targets.add(opt._uid);
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
    const draft = livePreviewOptions?.[question._uid];
    const selected = resolveSelectedOption(question, answers, draft ?? undefined);
    const checkboxes = resolveCheckboxSelections(question, answers);

    for (const cb of checkboxes) {
      if (cb.label) checkboxFeatures.push(cb.label);
      totalPrice += parsePrice(cb.price);
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
      canvasUid = selected._uid;
      canvasImage = String(selected.image);
      canvasQuestion = question;
    }
  }

  // Pass 3: Resolve place-mode overlays
  for (const { selected } of selectedItems) {
    if (selected.field_type === "image_radio" && isPlaceMode(selected) && selected.image) {
      const targetUid =
        selected.target_image_field || selected.placement?.target_field || null;

      if (!canvasImage && targetUid) {
        const targetOpt = optionByUid.get(targetUid);
        if (targetOpt?.image) {
          canvasUid = targetUid;
          canvasImage = String(targetOpt.image);
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
        targetUid,
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
        (selected.fill_target_question && canvasQuestion?._uid === selected.fill_target_question);

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
    if (!layer.targetUid) return true;
    return layer.targetUid === canvasUid;
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
