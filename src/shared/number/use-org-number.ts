"use client";

import * as React from "react";
import {
  formatOrgNumber,
  formatOrgNumberValue,
  formatOrgQuantity,
  parseOrgNumberInput,
} from "@/shared/number/format-number.util";
import { getOrgNumberFormat, useOrgNumberStore } from "@/shared/number/org-number.store";

export function useOrgNumber() {
  const numberFormat = useOrgNumberStore((s) => s.numberFormat);
  const loaded = useOrgNumberStore((s) => s.loaded);

  const formatNumber = React.useCallback(
    (amount: number, decimalPlaces = 2) => formatOrgNumber(amount, decimalPlaces, numberFormat),
    [numberFormat],
  );
  const formatNumberValue = React.useCallback(
    (value: unknown, decimalPlaces = 2) => formatOrgNumberValue(value, decimalPlaces, numberFormat),
    [numberFormat],
  );
  const parseNumber = React.useCallback(
    (raw: unknown) => parseOrgNumberInput(raw, numberFormat),
    [numberFormat],
  );

  const formatQuantity = React.useCallback(
    (value: unknown) => formatOrgQuantity(value, numberFormat),
    [numberFormat],
  );

  return { numberFormat, loaded, formatNumber, formatNumberValue, formatQuantity, parseNumber };
}

export { getOrgNumberFormat };
