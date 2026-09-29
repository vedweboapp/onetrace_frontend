/**
 * Kiosk Submission Schema
 * ──────────────────────────────────────────────────────────────────────────────
 * Defines the exact shape of the payload sent to the backend when a user
 * submits a kiosk form (KioskRenderer → onSubmit → API).
 *
 * Every field is documented so the backend team can map it 1-to-1.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { PlacementCoordinates } from "./kiosk.types";

// ── Per-option selection ──────────────────────────────────────────────────────

export interface KioskSelectedOption {
  /** Internal UID generated on the frontend — stable across saves */
  option_uid: string;

  /** Backend database id (null when option has not been persisted yet) */
  option_id: string | number | null;

  /** Snake_case API identifier set by the builder (e.g. "navy_blue") */
  option_api_name: string;

  /** Human-readable label shown in the kiosk (e.g. "Navy Blue") */
  option_label: string;

  /**
   * The submitted value.
   * - radio / image_radio  → the value string set in the builder
   * - color / color_swatch → the hex or rgba string chosen by the user
   * - checkbox             → same as radio (one entry per selected option)
   */
  value: string | number;

  /** Price / surcharge for this option (0 when not set) */
  price: number;

  // ── Type-specific extras (null when not applicable) ───────────────────────

  /** Resolved hex/rgba color — present for color & color_swatch options */
  color: string | null;

  /** Absolute URL of the option image — present for image_radio options */
  image_url: string | null;

  /**
   * Placement mode — present for image_radio options only.
   * "place"  → overlaid on a target canvas at a specific position
   * "group"  → rendered as a standard grouped option
   */
  placement_mode: "place" | "group" | null;

  /**
  /** Normalized overlay corners relative to the target canvas. */
  placement_coordinates: PlacementCoordinates | null;

  /** UID of the canvas (image_radio option) this object is placed on.
   * Only set when placement_mode === "place".
   */
  placement_target_uid: string | null;

  /** All canvas UIDs this object is configured to place onto. */
  placement_target_uids?: string[] | null;

  // ── Group & Input extras ──────────────────────────────────────────────────

  /** UID of the inner frame group inside the question */
  group_uid?: string | null;

  /** Name of the inner frame group (e.g. "Group 1") */
  group_name?: string | null;

  /** Format type if field_type === "input" (e.g. "text", "number", "email", "tel", "textarea") */
  input_type?: string | null;

  /** Placeholder configured for input fields */
  placeholder?: string | null;
}

// ── Per-question response ─────────────────────────────────────────────────────

export interface KioskResponseItem {
  /** UID of the question */
  question_uid: string;

  /** Backend database id of the question (null when not persisted) */
  question_id: string | number | null;

  /** Snake_case API key for this question (e.g. "color_choice") */
  question_api_name: string;

  /** Human-readable question label */
  question_label: string;

  /**
   * Field type of the options in this question.
   * Matches KioskOption.field_type.
   */
  field_type: "radio" | "checkbox" | "color" | "color_swatch" | "image_radio" | "input" | string;

  /** Lookup metadata when this question loads its options from an item group. */
  is_lookup?: boolean;
  item_group_id?: string | number | null;

  /**
   * The single selected option.
   * Populated for: radio, color, color_swatch, image_radio.
   * null when the question was left unanswered or contains multi-value fields.
   */
  selected_option: KioskSelectedOption | null;

  /**
   * All selected options for multi-select (checkbox) or input fields.
   * Unlike radio buttons which only yield 1 answer value, input fields and checkboxes
   * can have multiple answer values simultaneously.
   */
  selected_options: KioskSelectedOption[];

  /**
   * Key-value dictionary of input values for input fields: { [api_name]: value }
   */
  input_values?: Record<string, string | number>;

  /**
   * Inner frame groups inside this question with their resolved options.
   */
  groups?: {
    group_uid: string;
    group_name: string;
    selected_options: KioskSelectedOption[];
    input_values?: Record<string, string | number>;
  }[];

  /** Sum of prices for all selected options in this question */
  subtotal: number;

  /** true when the user answered this question */
  is_answered: boolean;
}

// ── Top-level submission payload ──────────────────────────────────────────────

export interface KioskSubmissionPayload {
  /** Backend id of the kiosk configuration (null for anonymous previews) */
  kiosk_id: string | number | null;

  /** Snake_case API identifier of the kiosk */
  kiosk_api_name: string;

  /** Human-readable kiosk name */
  kiosk_name: string;

  /** ISO 8601 timestamp of the submission moment */
  submitted_at: string;

  /** Per-question responses — one entry per active (non-deleted) question */
  responses: KioskResponseItem[];

  /**
   * Grand total price — sum of all per-question subtotals.
   * Rounded to 2 decimal places.
   */
  total_price: number;

  /**
   * Flat summary list — useful for display / email / PDF generation.
   */
  summary: KioskSubmissionSummaryItem[];

}

// ── Flat summary item (derived convenience field) ─────────────────────────────

export interface KioskSubmissionSummaryItem {
  question_api_name: string;
  question_label: string;
  field_type: string;
  /** Comma-joined labels for checkboxes; single label otherwise */
  value_label: string;
  /** Comma-joined raw values */
  value: string;
  price: number;
}
