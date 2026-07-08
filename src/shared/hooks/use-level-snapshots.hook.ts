import * as React from "react";
import type { Drawing } from "@/features/projects/types/drawing.types";
import { getOrCreateLevelSnapshot, releaseLevelSnapshot, type LevelSnapshot } from "../utils/pdf-snapshot.util";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";

export type LevelSnapshotState = {
  status: "loading" | "ready" | "error";
  snapshot?: LevelSnapshot;
};

function isPdfFile(file: string, fileType?: string | null): boolean {
  if (fileType?.toLowerCase().includes("pdf")) return true;
  return /\.pdf(\?|#|$)/i.test(file);
}

export function useLevelSnapshots(locations: Drawing[]) {
  const [snapshotMap, setSnapshotMap] = React.useState<Map<number, LevelSnapshotState>>(new Map());

  // Use a ref to keep track of active URLs for cleanup
  const activeUrlsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;
    const currentPdfLevels = locations.filter((level) =>
      level.drawing_file && isPdfFile(level.drawing_file, level.drawing_file_type)
    );

    const nextUrls = new Set<string>();
    const resolvedUrlMap = new Map<number, string>();

    for (const level of currentPdfLevels) {
      const resolved = resolveDrawingFileUrl(level.drawing_file);
      if (resolved) {
        nextUrls.add(resolved);
        resolvedUrlMap.set(level.id, resolved);
      }
    }

    // Release URLs that are no longer in locations
    for (const prevUrl of activeUrlsRef.current) {
      if (!nextUrls.has(prevUrl)) {
        releaseLevelSnapshot(prevUrl);
      }
    }
    activeUrlsRef.current = nextUrls;

    // Trigger loads and manage state
    setSnapshotMap((prev) => {
      const nextMap = new Map<number, LevelSnapshotState>();
      for (const level of currentPdfLevels) {
        const resolved = resolvedUrlMap.get(level.id);
        if (!resolved) continue;

        // Carry over existing ready states if they exist to avoid resetting to loading state
        const existing = prev.get(level.id);
        if (existing) {
          nextMap.set(level.id, existing);
        } else {
          nextMap.set(level.id, { status: "loading" });
        }
      }
      return nextMap;
    });

    for (const level of currentPdfLevels) {
      const resolved = resolvedUrlMap.get(level.id);
      if (!resolved) continue;

      getOrCreateLevelSnapshot(resolved)
        .then((snapshot) => {
          if (cancelled) return;
          setSnapshotMap((prev) => {
            const next = new Map(prev);
            next.set(level.id, { status: "ready", snapshot });
            return next;
          });
        })
        .catch(() => {
          if (cancelled) return;
          setSnapshotMap((prev) => {
            const next = new Map(prev);
            next.set(level.id, { status: "error" });
            return next;
          });
        });
    }

    return () => {
      cancelled = true;
    };
  }, [locations]);

  // Clean up all active snapshots on unmount
  React.useEffect(() => {
    return () => {
      for (const url of activeUrlsRef.current) {
        releaseLevelSnapshot(url);
      }
    };
  }, []);

  return snapshotMap;
}
