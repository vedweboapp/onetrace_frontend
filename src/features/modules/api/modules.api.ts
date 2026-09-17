import api from "@/core/api/axios";
import { MODULES_API_PATHS } from "./modules.paths";

export async function getModulesList(params?: any): Promise<any> {
  const { data } = await api.get(MODULES_API_PATHS.modulesList, { params });
  return data;
}
