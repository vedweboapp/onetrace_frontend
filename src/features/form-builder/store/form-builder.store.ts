import { create } from "zustand";
import { toast } from "sonner";
import { 
  getFormsList, 
  createFormLayout, 
  createModuleLayout,
  getFormSchema as fetchFormSchema, 
  getFormSchemaById as fetchFormSchemaById, 
  editFormSchema 
} from "../api/form-builder.api";

interface FormBuilderState {
  formSchema: any[];
  formList: any[];
  isLoading: boolean;
  loadedModule: string | null;
  _fetchingModule: string | null;
  getFormList: (params?: any) => Promise<void>;
  createForm: (module: string, payload: any, purpose?: string | null) => Promise<void>;
  createModule: (payload: any) => Promise<void>;
  getFormSchema: (module: string) => Promise<any>;
  getFormSchemaById: (id: string | number, moduleId?: string | number) => Promise<any>;
  editForm: (id: string | number, data: any, moduleId?: string | number, purpose?: string | null) => Promise<any>;
  clearSchema: () => void;
}

export const useFormStore = create<FormBuilderState>((set, get) => ({
  formSchema: [],
  formList: [],
  isLoading: false,
  loadedModule: null,
  _fetchingModule: null,

  getFormList: async (params) => {
    try {
      set({ isLoading: true });
      const response = await getFormsList(params);
      set({ formList: response || [], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error(error);
    }
  },

  createForm: async (module, payload, purpose) => {
    try {
      await createFormLayout(module, payload, purpose);
      toast.success("Layout created successfully");
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong");
      throw error;
    }
  },

  createModule: async (payload) => {
    try {
      await createModuleLayout(payload);
      toast.success("Module created successfully");
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong");
      throw error;
    }
  },

  getFormSchemaById: async (id, moduleId) => {
    try {
      set({ isLoading: true, formSchema: [], loadedModule: null, _fetchingModule: null });
      const response = await fetchFormSchemaById(id, moduleId);
      const schemaData = response?.data?.sections || response?.sections || [];
      set({ formSchema: schemaData, isLoading: false });
      return response;
    } catch (error) {
      set({ isLoading: false });
      console.error(error);
    }
  },

  getFormSchema: async (module) => {
    const state = get();
    if (state.loadedModule === module) return;
    if (state._fetchingModule === module) return;

    try {
      set({ isLoading: true, _fetchingModule: module });
      const response = await fetchFormSchema(module);
      const schemaData = response?.data?.sections || response?.sections || [];
      set({
        formSchema: schemaData,
        isLoading: false,
        loadedModule: module,
        _fetchingModule: null,
      });
      return response;
    } catch (error) {
      set({ isLoading: false, _fetchingModule: null });
      console.error(error);
    }
  },

  editForm: async (id, data, moduleId, purpose) => {
    try {
      const response = await editFormSchema(id, data, moduleId, purpose);
      toast.success("Layout updated successfully");
      return response;
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong");
      throw error;
    }
  },

  clearSchema: () => {
    set({ formSchema: [], loadedModule: null, _fetchingModule: null });
  }
}));

export default useFormStore;
