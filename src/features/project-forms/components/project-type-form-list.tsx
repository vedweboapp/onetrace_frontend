"use client";

import { useRouter } from '@/i18n/navigation';
import { AppButton, ListPageSearchField } from '@/shared/ui'
import { Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import React from 'react'

const ProjectTypeFormList = () => {
    // const t = useTranslations("Dashboard.projectTypes");
    // const tList = useTranslations("Dashboard.list");
    const [search, setSearch] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    // const [items, setItems] = React.useState<ProjectType[]>([]);
    const [pagination, setPagination] = React.useState({
        total_records: 0,
        total_pages: 1,
        current_page: 1,
        page_size: 20,
        next: null as string | null,
        previous: null as string | null,
    });
    const route = useRouter()
    const { id } = useParams()
    return (
        <div>
            <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 flex  items-center justify-between">
                <ListPageSearchField placeholder="Search project type forms" ariaLabel="Search project type forms" value={search} onCommit={(q) => setSearch(q || "")} />
                <AppButton onClick={() => route.push(`/dashboard/settings/project-type-forms/${id}/form-list/create?purpose=create_project_from`)}>
                    <Plus className="size-4" /> Create new form
                </AppButton>
            </div>
            {/* table start here */}
            {/* tablestate.ts call here */}
            <div>

            </div>

        </div>
    )
}

export default ProjectTypeFormList