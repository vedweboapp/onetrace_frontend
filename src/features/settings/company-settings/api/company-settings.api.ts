import api from "@/core/api/axios";
import { COMPANY_SETTING_PATH } from "./company-setting.path";
import { OrganizationDetails, UpdateOrganizationRequest } from "../types/types";

const mapResponseToOrganization = (responseData: Record<string, unknown>): OrganizationDetails => ({
  id: Number(responseData.id),
  logo: (responseData.company_logo as string | null) ?? null,
  name: (responseData.company_name as string) || "",
  size: (responseData.company_size as string) || "",
  description: (responseData.description as string) || "",
  website: (responseData.website_link as string) || "",
  timezone: (responseData.timezone as string) || "",
  street: (responseData.street_address as string) || "",
  city: (responseData.city as string) || "",
  state: (responseData.state as string) || "",
  zip: (responseData.pincode as string) || "",
  country: (responseData.country as string) || "",
  currencyCode: (responseData.currency as string) || (responseData.currency_code as string) || "INR",
  currencyName: (responseData.currency_name as string) || "Indian Rupee",
  formatType: (responseData.format as string) || (responseData.format_type as string) || "symbol",
  symbol: (responseData.symbol as string) || "₹",
  symbolPosition: (responseData.symbol_position as string) || "before",
  digitSeparator: (responseData.digit_separator as string) || "1,234,567.89",
  decimalPlaces:
    responseData.decimal_places !== undefined ? Number(responseData.decimal_places) : 2,
  startTime: (responseData.start_time as string) || "09:00",
  endTime: (responseData.end_time as string) || "17:00",
  workingDays:
    (responseData.working_days as string[]) || [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ],
  breakDuration: (responseData.break_duration as string) || "30 minutes",
});

/** Maps changed app fields to API payload keys (only include keys present in patch). */
const mapPatchToApiPayload = (patch: Partial<UpdateOrganizationRequest>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  const set = (apiKey: string, value: unknown) => {
    if (value !== undefined) payload[apiKey] = value;
  };

  if ("name" in patch) set("company_name", patch.name);
  if ("size" in patch) set("company_size", patch.size);
  if ("description" in patch) set("description", patch.description);
  if ("website" in patch) set("website_link", patch.website);
  if ("timezone" in patch) set("timezone", patch.timezone);
  if ("street" in patch) set("street_address", patch.street);
  if ("city" in patch) set("city", patch.city);
  if ("state" in patch) set("state", patch.state);
  if ("zip" in patch) set("pincode", patch.zip);
  if ("country" in patch) set("country", patch.country);

  if ("currencyCode" in patch) {
    set("currency", patch.currencyCode);
    set("currency_code", patch.currencyCode);
  }
  if ("currencyName" in patch) set("currency_name", patch.currencyName);
  if ("formatType" in patch) {
    set("format", patch.formatType);
    set("format_type", patch.formatType);
  }
  if ("symbol" in patch) set("symbol", patch.symbol);
  if ("symbolPosition" in patch) set("symbol_position", patch.symbolPosition);
  if ("digitSeparator" in patch) set("digit_separator", patch.digitSeparator);
  if ("decimalPlaces" in patch) set("decimal_places", patch.decimalPlaces);

  if ("startTime" in patch) set("start_time", patch.startTime);
  if ("endTime" in patch) set("end_time", patch.endTime);
  if ("workingDays" in patch) set("working_days", patch.workingDays);
  if ("breakDuration" in patch) set("break_duration", patch.breakDuration);

  if ("logo" in patch) {
    if (patch.logo instanceof File) {
      // handled below via FormData
    } else if (patch.logo === null) {
      set("company_logo", null);
    }
  }

  return payload;
};

export const getOrganizationDetails = async (id: number): Promise<OrganizationDetails> => {
  const { data } = await api.get(COMPANY_SETTING_PATH.getOrganizationDetails(id));
  const responseData = (data.data || data) as Record<string, unknown>;
  return mapResponseToOrganization(responseData);
};

export const updateOrganizationDetails = async (
  id: number,
  patch: Partial<UpdateOrganizationRequest>,
): Promise<OrganizationDetails> => {
  const apiFields = mapPatchToApiPayload(patch);
  const logoFile = patch.logo instanceof File ? patch.logo : null;

  let submitData: Record<string, unknown> | FormData = apiFields;
  let headers: Record<string, string> | undefined;

  if (logoFile) {
    const formData = new FormData();
    Object.entries(apiFields).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    formData.append("company_logo", logoFile);
    submitData = formData;
    headers = { "Content-Type": "multipart/form-data" };
  }

  const { data } = await api.put(
    COMPANY_SETTING_PATH.updateOrganizationDetails(id),
    submitData,
    { headers },
  );
  const responseData = (data.data || data) as Record<string, unknown>;
  return mapResponseToOrganization(responseData);
};
