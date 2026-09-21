import type { PlacementScaleRatio, PositionValue } from "../types/kiosk.types";
import { cn } from "@/core/utils/http.util";

/** Absolute positioning classes for overlay objects on a kiosk canvas */
export function kioskPlacementOverlayClass(
  position?: PositionValue | null,
  sizeClass = "size-16",
): string {
  return cn(
    "absolute z-10 overflow-hidden rounded-md border-2 border-white shadow-lg transition-all duration-200",
    sizeClass,
    position === "top" && "top-2 left-1/2 -translate-x-1/2",
    position === "bottom" && "bottom-2 left-1/2 -translate-x-1/2",
    position === "left" && "left-2 top-1/2 -translate-y-1/2",
    position === "right" && "right-2 top-1/2 -translate-y-1/2",
    (!position || position === "center") && "inset-0 m-auto",
  );
}

export function kioskPlacementScaleRatioClass(
  scaleRatio?: PlacementScaleRatio | null,
  fallbackClass = "h-16 w-16",
): string {
  switch (scaleRatio) {
    case "door":
      return "h-[90%] w-[35%]";
    case "strip":
      return "h-[20%] w-[80%]";
    case "square":
      return "h-auto w-[80%] max-h-[80%] max-w-[80%] aspect-square";
    case "framed":
      return "h-[80%] w-[80%]";
    default:
      return fallbackClass;
  }
}
