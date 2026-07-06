import type { DrawingPlot, DrawingPin } from "@/features/projects/types/drawing.types";

export function collectDrawingPins(plots?: DrawingPlot[] | null): DrawingPin[] {
  if (!plots?.length) return [];
  return plots.flatMap((plot) => plot?.pins ?? []);
}

export function countDrawingPins(plots?: DrawingPlot[] | null, fallback?: number): number {
  if (plots?.length) return collectDrawingPins(plots).length;
  return typeof fallback === "number" ? fallback : 0;
}
