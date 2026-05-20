"use client";

import * as React from "react";
import { CheckmarkSelect } from "./checkmark-select";

type Props = {
  activeLabel: string;
  inactiveLabel: string;
  filterLabel: string;
  filterAriaLabel: string;
  isActiveParam: string | null;
  onChange: (isActive: boolean) => void;
  className?: string;
};

/**
 * Shared active/inactive filter for list pages. Design changes here apply to all entity lists.
 */
export function ListPageActiveFilter({
  activeLabel,
  inactiveLabel,
  filterLabel,
  filterAriaLabel,
  isActiveParam,
  onChange,
  className,
}: Props) {
  const options = React.useMemo(
    () => [
      { value: "true", label: activeLabel },
      { value: "false", label: inactiveLabel },
    ],
    [activeLabel, inactiveLabel],
  );

  return (
    <CheckmarkSelect
      listLabel={filterLabel}
      buttonAriaLabel={filterAriaLabel}
      options={options}
      value={isActiveParam === "false" ? "false" : "true"}
      emptyLabel={activeLabel}
      portaled
      className={className ?? "w-full min-w-0 sm:w-44"}
      onChange={(v) => onChange(v !== "false")}
    />
  );
}
