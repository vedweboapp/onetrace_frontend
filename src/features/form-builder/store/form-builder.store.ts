import { create } from "zustand";
import { toast } from "sonner";
import { 
  getFormsList, 
  createFormLayout, 
  getFormSchema, 
  getFormSchemaById, 
  editFormSchema 
} from "../api/form-builder.api";

interface FormBuilderState {
  formSchema: any[];
  formList: any[];
  isLoading: boolean;
  loadedModule: string | null;
  _fetchingModule: string | null;
  getFormList: (params?: any) => Promise<void>;
  createForm: (module: string, payload: any) => Promise<void>;
  getFormSchema: (module: string) => Promise<void>;
  getFormSchemaById: (id: string | number) => Promise<void>;
  editForm: (id: string | number, data: any) => Promise<any>;
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

  createForm: async (module, payload) => {
    try {
      await createFormLayout(module, payload);
      toast.success("Layout created successfully");
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong");
    }
  },

  getFormSchemaById: async (id) => {
    try {
      set({ isLoading: true, formSchema: [], loadedModule: null, _fetchingModule: null });
      const response = await getFormSchemaById(id);
      set({ formSchema: response?.sections || [], isLoading: false });
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
      const response = await getFormSchema(module);
      set({
        formSchema: response?.sections || [],
        isLoading: false,
        loadedModule: module,
        _fetchingModule: null,
      });
    } catch (error) {
      set({ isLoading: false, _fetchingModule: null });
      console.error(error);
    }
  },

  editForm: async (id, data) => {
    try {
      const response = await editFormSchema(id, data);
      toast.success("Layout updated successfully");
      return response;
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong");
    }
  }
}));

export default useFormStore;
