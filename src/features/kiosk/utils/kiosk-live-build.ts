import type {
  KioskConfig,
  KioskOption,
  KioskQuestion,
  PlacementCoordinates,
} from "../types/kiosk.types";
import { DEFAULT_PLACEMENT_COORDINATES } from "./kiosk-placement-styles";
import { preloadImage } from "./kiosk-color-fill";

export type KioskAnswerValue =
  | { uid?: string; o_id?: string; id?: string | number; value?: string | number; [key: string]: unknown }
  | { uid?: string; o_id?: string; id?: string | number; value?: string | number; [key: string]: unknown }[]
  | string
  | number
  | null
  | undefined;

export interface LiveBuildOverlay {
  uid?: string | null;
  image: string;
  coordinates: PlacementCoordinates;
  label?: string;
  targetUid?: string | null;
  targetUids?: string[];
  questionUid?: string | null;
  color?: string | null;
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

/**
 * Preloads all images in the kiosk configuration into browser memory cache and decodes them in GPU.
 */
export function preloadKioskImages(config?: KioskConfig | null) {
  if (typeof window === "undefined" || !config || !Array.isArray(config.questions)) return;
  const urls = new Set<string>();
  for (const q of config.questions) {
    if (q.is_deleted) continue;
    const checkOpt = (opt: KioskOption) => {
      if (opt.image) urls.add(opt.image);
      if (opt.target_image_field) urls.add(opt.target_image_field);
      if (opt.selected_image_field) urls.add(opt.selected_image_field);
    };
    for (const opt of q.options || []) checkOpt(opt);
    if (q.groups) {
      for (const g of q.groups) {
        for (const opt of g.options || []) checkOpt(opt);
      }
    }
  }
  urls.forEach((url) => {
    if (url && typeof url === "string" && (url.startsWith("http") || url.startsWith("/") || url.startsWith("data:"))) {
      void preloadImage(url);
    }
  });
}

const getOptionKey = (opt: KioskOption): string =>
  opt.o_id || opt.uid || opt._uid || "";

function getAllQuestionOptions(q: KioskQuestion): KioskOption[] {
  const seen = new Set<string>();
  const all: KioskOption[] = [];
  const pushOpt = (opt: KioskOption) => {
    if (!opt) return;
    const key = getOptionKey(opt);
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
      const id = getOptionKey(opt);
      if (id) map.set(id, opt);
    }
  }
  return map;
}

function resolveAllQuestionSelections(
  question: KioskQuestion,
  answers: Record<string, KioskAnswerValue>,
  draft?: KioskOption | null,
): KioskOption[] {
  const options = getAllQuestionOptions(question);
  if (draft) return [draft];

  const qKey = question.api_name || question.q_id || question._uid || "";
  const ans =
    answers[qKey] ??
    (question.q_id ? answers[question.q_id] : undefined) ??
    (question._uid ? answers[question._uid] : undefined);
  if (!ans) return [];

  const selectedList: KioskOption[] = [];
  const selectedOptIds = new Set<string>();

  const checkAndAdd = (optId: unknown, fallbackVal?: unknown) => {
    if (optId == null) return;
    const strId = String(optId);
    const opt = options.find(
      (o) =>
        String(getOptionKey(o)) === strId ||
        (o.id != null && String(o.id) === strId) ||
        (o.o_id != null && String(o.o_id) === strId) ||
        (o.uid != null && String(o.uid) === strId) ||
        (o.value != null && String(o.value) === strId) ||
        (o.label != null && String(o.label) === strId) ||
        (fallbackVal != null &&
          (String(o.value) === String(fallbackVal) || String(o.label) === String(fallbackVal))),
    );
    if (opt && opt.field_type !== "input") {
      const uniqueKey = getOptionKey(opt) || String(opt.id);
      if (!selectedOptIds.has(uniqueKey)) {
        selectedOptIds.add(uniqueKey);
        selectedList.push(opt);
      }
    }
  };

  if (Array.isArray(ans)) {
    for (const entry of ans) {
      if (entry == null) continue;
      if (typeof entry === "object") {
        const targetId = entry.o_id || entry.uid || entry.id;
        checkAndAdd(targetId, entry.value);
      } else {
        checkAndAdd(entry);
      }
    }
  } else if (typeof ans === "object") {
    const targetId = (ans as { o_id?: string; uid?: string; id?: string | number }).o_id ||
      (ans as { uid?: string }).uid ||
      (ans as { id?: string | number }).id;
    checkAndAdd(targetId, (ans as { value?: unknown }).value);
  } else {
    checkAndAdd(ans);
  }

  return selectedList;
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
      if (typeof entry === "object" && entry) {
        const targetId = entry.o_id || entry.uid;
        const opt = options.find((o) => String(getOptionKey(o)) === String(targetId) && o.field_type === "input");
        if (opt && String(entry.value ?? "").trim().length > 0) {
          results.push({ option: opt, value: String(entry.value) });
        }
      }
    }
  } else if (typeof ans === "object" && ans !== null) {
    const targetId = (ans as any).o_id || (ans as any).uid;
    const opt = options.find((o) => String(getOptionKey(o)) === String(targetId) && o.field_type === "input");
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
  const optId = getOptionKey(option);

  if (Array.isArray(ans)) {
    for (const entry of ans) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        (String((entry as any).o_id) === String(optId) || String(entry.uid) === String(optId)) &&
        typeof entry.value === "string" &&
        entry.value.startsWith("#")
      ) {
        return entry.value;
      }
    }
  } else if (
    typeof ans === "object" &&
    ans !== null &&
    (String((ans as any).o_id) === String(optId) || String(ans.uid) === String(optId)) &&
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

/**
 * Reads the numeric price from a KioskOption checking all known field name
 * variants: price, selling_price, unit_price, retail_price.
 */
function resolveOptionPrice(option: KioskOption): number {
  const raw =
    option.price ??
    (option as any).selling_price ??
    (option as any).unit_price ??
    (option as any).retail_price;
  return parsePrice(raw as KioskOption["price"]);
}

export function getTargetOptionUids(
  colorOption: KioskOption,
  questions: KioskQuestion[],
): string[] {
  const targets = new Set<string>();
  const addTarget = (id: any) => {
    if (id != null && String(id).trim() !== "") {
      targets.add(String(id).trim());
    }
  };

  if (Array.isArray(colorOption.fill_targets)) {
    for (const uid of colorOption.fill_targets) addTarget(uid);
  }
  if (Array.isArray((colorOption as any).color_fill?.imageIds)) {
    for (const uid of (colorOption as any).color_fill.imageIds) addTarget(uid);
  }
  if ((colorOption as any).color_fill?.imageId) {
    addTarget((colorOption as any).color_fill.imageId);
  }
  if (colorOption.target_image_field) {
    addTarget(colorOption.target_image_field);
  }
  if (colorOption.selected_image_field) {
    addTarget(colorOption.selected_image_field);
  }
  if (Array.isArray(colorOption.placement_targets)) {
    for (const uid of colorOption.placement_targets) addTarget(uid);
  }
  if (colorOption.placement?.target_field) {
    addTarget(colorOption.placement.target_field);
  }
  if (Array.isArray(colorOption.placement?.target_fields)) {
    for (const uid of colorOption.placement.target_fields) addTarget(uid);
  }
  const fillTargetQ =
    colorOption.fill_target_question ||
    colorOption.placement_target_question ||
    colorOption.placement?.target_question;
  if (fillTargetQ) {
    const q = questions.find(
      (item) => String(item.q_id || item._uid || item.id) === String(fillTargetQ),
    );
    if (q) {
      for (const opt of getAllQuestionOptions(q)) {
        const optId = getOptionKey(opt);
        if ((opt.image || opt.field_type === "image_radio" || opt.composite_item_id != null) && optId) {
          addTarget(optId);
        }
      }
    }
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
        const optId = getOptionKey(opt);
        if ((opt.image || opt.field_type === "image_radio" || opt.composite_item_id != null) && optId) {
          targets.add(optId);
        }
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
  /** User-edited placement coordinates keyed by option UID — overrides the static option placement */
  placementOverrides?: Record<string, PlacementCoordinates>,
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
    const qId = question.api_name || question.q_id || question._uid || "";
    const draft = livePreviewOptions?.[qId] ?? (question.q_id ? livePreviewOptions?.[question.q_id] : undefined);
    const selections = resolveAllQuestionSelections(question, answers, draft ?? undefined);

    for (const selected of selections) {
      if (selected.field_type === "checkbox" && selected.label) {
        checkboxFeatures.push(selected.label);
      }
      totalPrice += resolveOptionPrice(selected);

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

    const inputs = resolveInputSelections(question, answers);
    for (const inp of inputs) {
      totalPrice += resolveOptionPrice(inp.option);
      summaries.push({
        questionLabel: inp.option.label || "Input",
        option: inp.option,
      });
    }
  }

  // Pass 2: Resolve the base canvas image from user selections using relationship chains
  const placeModeItems = selectedItems.filter(
    (item) => isPlaceMode(item.selected) && !!item.selected.image,
  );
  const baseImageItems = selectedItems.filter(
    (item) => !isPlaceMode(item.selected) && !!item.selected.image,
  );

  // Collect all target option UIDs and target question UIDs from active place overlays
  const activeOverlayTargetOptionUids = new Set<string>();
  const activeOverlayTargetQuestionUids = new Set<string>();

  for (const { selected } of placeModeItems) {
    const targetUids = getPlacementTargetOptionUids(selected, questions);
    for (const u of targetUids) activeOverlayTargetOptionUids.add(String(u));
    const targetQ = selected.placement_target_question || selected.placement?.target_question;
    if (targetQ) activeOverlayTargetQuestionUids.add(String(targetQ));
  }

  // Priority 1: A selected base option whose UID is explicitly targeted by an active place overlay
  let primaryBaseItem = baseImageItems.find((item) => {
    const uid = getOptionKey(item.selected);
    return uid && activeOverlayTargetOptionUids.has(String(uid));
  });

  // Priority 2: A selected base option whose question is targeted by an active place overlay
  if (!primaryBaseItem) {
    primaryBaseItem = baseImageItems.find((item) => {
      const qUid = item.question.q_id || item.question._uid;
      return qUid && activeOverlayTargetQuestionUids.has(String(qUid));
    });
  }

  // Priority 3: A selected base option targeted by a color fill option
  if (!primaryBaseItem) {
    const colorItems = selectedItems.filter((item) => isColorType(item.selected));
    for (const { selected: colorOpt } of colorItems) {
      const colorTargets = getTargetOptionUids(colorOpt, questions);
      primaryBaseItem = baseImageItems.find((item) => {
        const uid = getOptionKey(item.selected);
        return uid && colorTargets.includes(String(uid));
      });
      if (primaryBaseItem) break;
    }
  }

  // Priority 4: Anchor to the first selected base image in question order (root product visual)
  // Subsequent unrelated questions (e.g. Question 3 items like standalone tools/items) will NOT overwrite this base canvas
  if (!primaryBaseItem && baseImageItems.length > 0) {
    primaryBaseItem = baseImageItems[0];
  }

  if (primaryBaseItem) {
    canvasUid = getOptionKey(primaryBaseItem.selected) || null;
    canvasImage = String(primaryBaseItem.selected.image);
    canvasQuestion = primaryBaseItem.question;
  }

  // Fallback: If no base image was selected by the user, but a place overlay is active with a target image in config, resolve from config
  if (!canvasImage && activeOverlayTargetOptionUids.size > 0) {
    for (const tUid of activeOverlayTargetOptionUids) {
      const targetOpt = optionByUid.get(tUid);
      if (targetOpt?.image) {
        canvasUid = tUid;
        canvasImage = String(targetOpt.image);
        for (const q of questions) {
          if (getAllQuestionOptions(q).some((o) => getOptionKey(o) === tUid)) {
            canvasQuestion = q;
            break;
          }
        }
        break;
      }
    }
  }

  // Pass 3: Resolve place-mode overlays that belong to the active visual chain
  for (const { question, selected } of placeModeItems) {
    const targetUids = getPlacementTargetOptionUids(selected, questions);
    const primaryTargetUid = targetUids[0] || selected.target_image_field || selected.placement?.target_field || null;
    const optUid = getOptionKey(selected) || null;
    const qUid = question.q_id || question._uid || null;

    // Check relationship: Does this overlay target the active canvas, or is there no canvas filter?
    const targetQuestionId = selected.placement_target_question || selected.placement?.target_question;
    const matchesCanvas =
      !canvasUid ||
      targetUids.length === 0 ||
      targetUids.includes(String(canvasUid)) ||
      (targetQuestionId && String(canvasQuestion?.q_id || canvasQuestion?._uid) === String(targetQuestionId));

    if (!matchesCanvas) continue;

    // User-edited coordinates take priority over the static option placement
    const userCoords = optUid ? placementOverrides?.[optUid] : undefined;
    const coordinates = userCoords
      ?? selected.placement?.coordinates
      ?? DEFAULT_PLACEMENT_COORDINATES;

    overlays.push({
      uid: optUid,
      image: String(selected.image),
      coordinates,
      label: selected.label || undefined,
      targetUid: primaryTargetUid,
      targetUids,
      questionUid: qUid,
      color: null,
    });
  }

  // Pass 4: Evaluate color fill — applies to targeted base canvas or overlay images
  for (const { selected, resolvedColor } of selectedItems) {
    if (!isColorType(selected)) continue;

    const chosenColor = resolvedColor || "#2563EB";
    const targets = getTargetOptionUids(selected, questions);
    let matchedAny = false;

    if (targets.length > 0 || selected.fill_target_question) {
      // Check overlays first
      for (const layer of overlays) {
        if (!layer.uid) continue;
        const isLayerTargeted =
          targets.includes(String(layer.uid)) ||
          (selected.fill_target_question &&
            String(layer.questionUid) === String(selected.fill_target_question));

        if (isLayerTargeted) {
          layer.color = chosenColor;
          matchedAny = true;
        }
      }

      // Check base canvas image
      if (canvasUid && canvasImage) {
        const isTargeted =
          targets.includes(String(canvasUid)) ||
          (selected.fill_target_question &&
            String(canvasQuestion?.q_id || canvasQuestion?._uid || canvasQuestion?.id) ===
              String(selected.fill_target_question));

        if (isTargeted) {
          colorApply = {
            sourceImage: canvasImage,
            color: chosenColor,
            targetUid: canvasUid,
          };
          matchedAny = true;
        }
      }
    } else {
      // No explicit targets configured on the color option:
      // If overlays exist, tint the overlay(s) ("the picture that it overlaps")!
      if (overlays.length > 0) {
        for (const layer of overlays) {
          layer.color = chosenColor;
          matchedAny = true;
        }
      } else if (canvasUid && canvasImage) {
        colorApply = {
          sourceImage: canvasImage,
          color: chosenColor,
          targetUid: canvasUid,
        };
        matchedAny = true;
      }
    }

    // If no canvas image or overlay is targeted or exists, fallback to solid color block
    if (!matchedAny && !canvasImage && overlays.length === 0) {
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
