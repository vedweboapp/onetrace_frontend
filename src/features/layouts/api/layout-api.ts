import api from "@/core/api/axios";
import { LAYOUTS_API_PATHS } from "./layouts-api.paths";

export async function getLayoutMetadata(moduleId: string | number): Promise<any> {
  const { data } = await api.get(LAYOUTS_API_PATHS.layoutMetadata(moduleId));
  return data.data || data;
}

export async function updateLayoutStatus(
  moduleId: string | number,
  layoutId: string | number,
  isActive: boolean
): Promise<any> {
  const url = `/modules/${moduleId}/sections/bulk/`;
  const { data } = await api.post(url, { 
    layout: { 
      id: layoutId,
      is_active: isActive 
    } 
  });
  return data.data || data;
}
