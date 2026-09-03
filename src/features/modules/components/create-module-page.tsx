import FormBuilderForm from "@/features/form-builder/components/form-builder-form";
import { routes } from "@/shared/config/routes";

const CreateModule = () => {
    return (
        <div>
            <FormBuilderForm BackUrl={routes.dashboard.settingsModules} />
        </div>
    );
};

export default CreateModule;