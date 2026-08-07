import { CreateProjectTypeForm } from "@/features/project-forms/components/create-project-type-from";

export default async function ProjectTypeCreateFormPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
      <CreateProjectTypeForm />
    </div>
  );
}
