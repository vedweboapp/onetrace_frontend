import api from "@/core/api/axios";
import { COMPANY_SETTING_PATH } from "./company-setting.path";
import { OrganizationDetails, UpdateOrganizationRequest } from "../types/types";

export const getOrganizationDetails = async (id: number): Promise<OrganizationDetails> => {
    const { data } = await api.get(COMPANY_SETTING_PATH.getOrganizationDetails(id));
    const responseData = data.data || data;

    return {
        id: responseData.id,
        logo: responseData.company_logo,
        name: responseData.company_name || "",
        size: responseData.company_size || "",
        description: responseData.description || "",
        website: responseData.website_link || "",
        timezone: responseData.timezone || "",
        street: responseData.street_address || "",
        city: responseData.city || "",
        state: responseData.state || "",
        zip: responseData.pincode || "",
        country: responseData.country || "",
        currencyCode: responseData.currency || responseData.currency_code || "INR",
        currencyName: responseData.currency_name || "Indian Rupee",
        formatType: responseData.format || responseData.format_type || "symbol",
        symbol: responseData.symbol || "₹",
        symbolPosition: responseData.symbol_position || "before",
        digitSeparator: responseData.digit_separator || "1,234,567.89",
        decimalPlaces: responseData.decimal_places !== undefined ? Number(responseData.decimal_places) : 2,
        startTime: responseData.start_time || "09:00",
        endTime: responseData.end_time || "17:00",
        workingDays: responseData.working_days || ["monday", "tuesday", "wednesday", "thursday", "friday"],
        breakDuration: responseData.break_duration || "30 minutes",
    };
};

export const updateOrganizationDetails = async (id: number, body: UpdateOrganizationRequest): Promise<OrganizationDetails> => {
    const payload: any = {
        company_name: body.name,
        company_size: body.size,
        description: body.description,
        website_link: body.website,
        timezone: body.timezone,
        street_address: body.street,
        city: body.city,
        state: body.state,
        pincode: body.zip,
        country: body.country,
        currency: body.currencyCode,
        currency_code: body.currencyCode,
        currency_name: body.currencyName,
        format: body.formatType,
        format_type: body.formatType,
        symbol: body.symbol,
        symbol_position: body.symbolPosition,
        digit_separator: body.digitSeparator,
        decimal_places: body.decimalPlaces,
        start_time: body.startTime,
        end_time: body.endTime,
        working_days: body.workingDays,
        break_duration: body.breakDuration,
    };

    let submitData: any = payload;
    let headers: any = undefined;

    if (body.logo instanceof File) {
        submitData = new FormData();
        Object.keys(payload).forEach(key => {
            if (payload[key] !== null && payload[key] !== undefined) {
                submitData.append(key, payload[key]);
            }
        });
        submitData.append('company_logo', body.logo);
        headers = { 'Content-Type': 'multipart/form-data' };
    } else if (body.logo === null) {
        payload.company_logo = null;
    }

    const { data } = await api.put(COMPANY_SETTING_PATH.updateOrganizationDetails(id), submitData, { headers });
    const responseData = data.data || data;

    return {
        id: responseData.id,
        logo: responseData.company_logo,
        name: responseData.company_name || "",
        size: responseData.company_size || "",
        description: responseData.description || "",
        website: responseData.website_link || "",
        timezone: responseData.timezone || "",
        street: responseData.street_address || "",
        city: responseData.city || "",
        state: responseData.state || "",
        zip: responseData.pincode || "",
        country: responseData.country || "",
        currencyCode: responseData.currency || responseData.currency_code || "INR",
        currencyName: responseData.currency_name || "Indian Rupee",
        formatType: responseData.format || responseData.format_type || "symbol",
        symbol: responseData.symbol || "₹",
        symbolPosition: responseData.symbol_position || "before",
        digitSeparator: responseData.digit_separator || "1,234,567.89",
        decimalPlaces: responseData.decimal_places !== undefined ? Number(responseData.decimal_places) : 2,
        startTime: responseData.start_time || "09:00",
        endTime: responseData.end_time || "17:00",
        workingDays: responseData.working_days || ["monday", "tuesday", "wednesday", "thursday", "friday"],
        breakDuration: responseData.break_duration || "30 minutes",
    };
};
