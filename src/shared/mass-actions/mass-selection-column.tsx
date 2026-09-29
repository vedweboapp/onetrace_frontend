"use client";

import * as React from "react";
import type { EntityTableColumn } from "@/shared/components/entity/entity-table-columns";
import { entityCol } from "@/shared/components/entity";

type MassSelectionApi = {
  selection: {
    selectAllRef: React.RefObject<HTMLInputElement | null>;
    rowCheckboxClassName: string;
    allMatchingSelected: boolean;
    selectingAll: boolean;
    isSelected: (id: number) => boolean;
    toggleSelectAll: () => Promise<void>;
    toggleRowSelected: (id: number) => void;
  };
  selectAllAriaLabel: string;
  selectRowAriaLabel: string;
};

type MassSelectionColumnOptions<T> = {
  isRowSelectable?: (row: T) => boolean;
  /** Rows that can be selected on the current page (for header select-all disabled state). */
  selectableCount?: number;
};

/** Table selection column + card leading checkbox for list mass actions. */
export function massSelectionColumn<T extends { id: number }>(
  mass: MassSelectionApi,
  itemsLength: number,
  options?: MassSelectionColumnOptions<T>,
): {
  tableColumn: EntityTableColumn<T>;
  cardLeading: (row: T) => React.ReactNode;
} {
  const c = entityCol<T>();
  const { selection, selectAllAriaLabel, selectRowAriaLabel } = mass;
  const selectableCount = options?.selectableCount ?? itemsLength;

  const checkbox = (row: T) => {
    const selectable = options?.isRowSelectable?.(row) ?? true;
    return (
      <input
        type="checkbox"
        className={selection.rowCheckboxClassName}
        checked={selection.isSelected(row.id)}
        disabled={!selectable}
        aria-label={selectRowAriaLabel}
        onChange={() => {
          if (selectable) selection.toggleRowSelected(row.id);
        }}
      />
    );
  };

  return {
    tableColumn: c.selection(
      "select",
      (
        <input
          ref={selection.selectAllRef}
          type="checkbox"
          className={selection.rowCheckboxClassName}
          checked={selection.allMatchingSelected}
          disabled={selection.selectingAll || selectableCount === 0}
          aria-label={selectAllAriaLabel}
          onChange={() => void selection.toggleSelectAll()}
        />
      ),
      checkbox,
      { narrow: true },
    ),
    cardLeading: checkbox,
  };
}
