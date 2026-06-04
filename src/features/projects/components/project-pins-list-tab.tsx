import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTh,
} from "@/shared/ui";
import { useTranslations } from "next-intl";
import React from "react";

const ProjectPinsListTab = () => {
  const ts = useTranslations("Dashboard.projects.detail.pinsTableHeaders");
  const tableHeaders = [
    ts("location"),
    ts("drawing"),
    ts("plot"),
    ts("Product"),
    ts("status"),
    ts("createdAt"),
  ];
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col ">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Pins
          </h2>
          <span className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Mangage and view all pins for this project.
          </span>
        </div>
      </div>

      {/* table starts here */}
      <DataTable className="mt-6">
        <DataTableHead>
          <DataTableRow>
            {tableHeaders.map((header) => (
              <DataTableTh key={header}>{header}</DataTableTh>
            ))}
          </DataTableRow>
        </DataTableHead>
        <DataTableBody></DataTableBody>
      </DataTable>
    </div>
  );
};

export default ProjectPinsListTab;
