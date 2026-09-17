import type { PositionValue } from "../types/kiosk.types";
import { cn } from "@/core/utils/http.util";

/** Absolute positioning classes for overlay objects on a kiosk canvas */
export function kioskPlacementOverlayClass(
  position?: PositionValue | null,
  sizeClass = "size-16",
): string {
  return cn(
    "absolute z-10 overflow-hidden rounded-md border-2 border-white shadow-lg transition-all duration-200",
    sizeClass,
    position === "top" && "top-2 inset-x-auto",
    position === "bottom" && "bottom-2 inset-x-auto",
    position === "left" && "left-2 inset-y-auto",
    position === "right" && "right-2 inset-y-auto",
    (!position || position === "center") && "inset-0 m-auto",
  );
}
