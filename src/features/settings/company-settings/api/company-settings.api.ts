import api from "@/core/api/axios";
import { COMPANY_SETTING_PATH } from "./company-setting.path";
import { OrganizationDetails, UpdateOrganizationRequest } from "../types/types";

export const getOrganizationDetails = async (id: number): Promise<OrganizationDetails> => {
    const { data } = await api.get(COMPANY_SETTING_PATH.getOrganizationDetails(id));
    return data.data;
};

export const updateOrganizationDetails = async (id: number, body: UpdateOrganizationRequest): Promise<OrganizationDetails> => {
    const { data } = await api.put(COMPANY_SETTING_PATH.updateOrganizationDetails(id), body);
    return data.data;
};