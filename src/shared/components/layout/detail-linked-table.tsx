"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
} from "@/shared/ui";

export type DetailLinkedTableColumn = {
  id: string;
  header: ReactNode;
  narrow?: boolean;
  align?: "left" | "right" | "center";
  /** Tailwind width class applied to `<col>` (e.g. `w-24`). */
  widthClass?: string;
  headerClassName?: string;
  cellClassName?: string;
};

type Props = {
  columns: DetailLinkedTableColumn[];
  children: ReactNode;
  showRowNumbers?: boolean;
  rowNumberHeader?: ReactNode;
};

function detailLinkedAlignClass(align: DetailLinkedTableColumn["align"]) {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

export function detailLinkedTableCellClassName(column: Pick<DetailLinkedTableColumn, "align" | "narrow" | "cellClassName">) {
  return cn(
    column.narrow ? "whitespace-nowrap" : "min-w-0",
    detailLinkedAlignClass(column.align),
    column.cellClassName,
  );
}

export function DetailLinkedTable({
  columns,
  children,
  showRowNumbers = true,
  rowNumberHeader = "#",
}: Props) {
  return (
    <DataTableScroll className="max-h-[min(28rem,50vh)] rounded-lg border border-slate-200 dark:border-slate-700">
      <DataTable className="table-fixed">
        <colgroup>
          {showRowNumbers ? <col className="w-11" /> : null}
          {columns.map((col) => (
            <col key={col.id} className={col.widthClass ?? (col.narrow ? "w-24" : undefined)} />
          ))}
        </colgroup>
        <DataTableHead>
          <tr>
            {showRowNumbers ? (
              <DataTableTh narrow className="text-center">
                {rowNumberHeader}
              </DataTableTh>
            ) : null}
            {columns.map((col) => (
              <DataTableTh
                key={col.id}
                narrow={col.narrow}
                className={cn(detailLinkedAlignClass(col.align), col.headerClassName)}
              >
                {col.header}
              </DataTableTh>
            ))}
          </tr>
        </DataTableHead>
        <DataTableBody>{children}</DataTableBody>
      </DataTable>
    </DataTableScroll>
  );
}

export function DetailLinkedTableRow({
  index,
  showRowNumber = true,
  children,
}: {
  index: number;
  showRowNumber?: boolean;
  children: ReactNode;
}) {
  return (
    <DataTableRow>
      {showRowNumber ? (
        <DataTableTd narrow className="text-center tabular-nums text-slate-500 dark:text-slate-400">
          {index + 1}
        </DataTableTd>
      ) : null}
      {children}
    </DataTableRow>
  );
}

export { DataTableTd as DetailLinkedTableTd };
