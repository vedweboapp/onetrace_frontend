import type { Drawing, DrawingPin } from "@/features/projects/types/drawing.types";
import type { Job, JobLevelSnapshot } from "@/features/jobs/types/job.types";

export type { JobLevelPinSnapshot, JobLevelPlotSnapshot, JobLevelSnapshot } from "@/features/jobs/types/job.types";

export function isPinToDoStatus(pin: DrawingPin): boolean {
  const name = pin.status_detail?.status_name?.trim().toLowerCase() ?? "";
  return name === "to do" || name === "todo";
}

/** Non–To Do pins cannot be toggled (locked). */
export function isJobFormPinCheckboxDisabled(pin: DrawingPin): boolean {
  return !isPinToDoStatus(pin);
}

export function extractJobLevelsFromJob(job: Job): JobLevelSnapshot[] {
  const raw = job as Job & { levels?: JobLevelSnapshot[] };
  if (!Array.isArray(raw.levels) || raw.levels.length === 0) return [];
  return raw.levels;
}

export function jobWasCreatedFromPins(job: Job): boolean {
  return extractJobLevelsFromJob(job).length > 0;
}

export function collectPinIdsFromJobLevels(levels: JobLevelSnapshot[]): Set<number> {
  const ids = new Set<number>();
  for (const level of levels) {
    for (const plot of level.plots ?? []) {
      for (const pin of plot.pins ?? []) {
        if (Number.isFinite(pin.id)) ids.add(pin.id);
      }
    }
  }
  return ids;
}

export function buildJobLevelsUpdatePayload(
  selectedPinIds: ReadonlySet<number>,
  drawings: Drawing[],
  initialLevels: JobLevelSnapshot[],
): JobLevelSnapshot[] {
  const levelById = new Map<number, JobLevelSnapshot>();

  const ensureLevel = (id: number, name: string, drawing_file?: string) => {
    if (!levelById.has(id)) {
      levelById.set(id, { id, name, drawing_file, plots: [] });
    }
    return levelById.get(id)!;
  };

  const ensurePlot = (level: JobLevelSnapshot, plotId: number, plotName: string) => {
    level.plots = level.plots ?? [];
    let plot = level.plots.find((row) => row.id === plotId);
    if (!plot) {
      plot = { id: plotId, name: plotName, pins: [] };
      level.plots.push(plot);
    }
    return plot;
  };

  const addPin = (
    levelId: number,
    levelName: string,
    plotId: number,
    plotName: string,
    pinId: number,
    drawing_file?: string,
  ) => {
    if (!selectedPinIds.has(pinId)) return;
    const level = ensureLevel(levelId, levelName, drawing_file);
    const plot = ensurePlot(level, plotId, plotName);
    plot.pins = plot.pins ?? [];
    if (!plot.pins.some((row) => row.id === pinId)) {
      plot.pins.push({ id: pinId });
    }
  };

  for (const drawing of drawings) {
    for (const plot of drawing.plots ?? []) {
      for (const pin of plot.pins ?? []) {
        addPin(drawing.id, drawing.name, plot.id, plot.name, pin.id, drawing.drawing_file);
      }
    }
  }

  for (const level of initialLevels) {
    for (const plot of level.plots ?? []) {
      for (const pin of plot.pins ?? []) {
        addPin(level.id, level.name, plot.id, plot.name, pin.id, level.drawing_file);
      }
    }
  }

  return [...levelById.values()]
    .map((level) => ({
      ...level,
      plots: (level.plots ?? [])
        .map((plot) => ({
          ...plot,
          pins: (plot.pins ?? []).filter((pin) => selectedPinIds.has(pin.id)),
        }))
        .filter((plot) => (plot.pins?.length ?? 0) > 0),
    }))
    .filter((level) => (level.plots?.length ?? 0) > 0);
}
