import api from "@/core/api/axios";
import { LAYOUTS_API_PATHS } from "./layouts-api.paths";

export async function getLayoutMetadata(moduleId: string | number): Promise<any> {
  const { data } = await api.get(LAYOUTS_API_PATHS.layoutMetadata(moduleId));
  return data.data || data;
}
