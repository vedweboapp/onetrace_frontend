import type { PlacementCoordinates } from "../types/kiosk.types";

export const DEFAULT_PLACEMENT_COORDINATES: PlacementCoordinates = {
  top_left: { x: 25, y: 25 },
  bottom_right: { x: 75, y: 75 },
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

export function normalizePlacementCoordinates(
  coordinates?: PlacementCoordinates | null,
): PlacementCoordinates {
  const source = coordinates || DEFAULT_PLACEMENT_COORDINATES;
  const left = clampPercent(source.top_left.x);
  const top = clampPercent(source.top_left.y);
  const right = clampPercent(source.bottom_right.x);
  const bottom = clampPercent(source.bottom_right.y);

  return {
    top_left: { x: Math.min(left, right), y: Math.min(top, bottom) },
    bottom_right: { x: Math.max(left, right), y: Math.max(top, bottom) },
  };
}

export function placementCoordinatesStyle(
  coordinates?: PlacementCoordinates | null,
): React.CSSProperties {
  const normalized = normalizePlacementCoordinates(coordinates);
  return {
    left: `${normalized.top_left.x}%`,
    top: `${normalized.top_left.y}%`,
    width: `${normalized.bottom_right.x - normalized.top_left.x}%`,
    height: `${normalized.bottom_right.y - normalized.top_left.y}%`,
  };
}
