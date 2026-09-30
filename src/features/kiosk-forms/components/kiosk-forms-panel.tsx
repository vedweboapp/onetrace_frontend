"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { getKiosksList } from "@/features/kiosk/api/kiosk.api";
import type { KioskListItem } from "@/features/kiosk/types/kiosk.types";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
	DataTablePaginationBar,
	ListPageEmptyStates,
	ListPageHeader,
	ListPageSearchField,
	SurfaceShell,
	listPageRootClassName,
} from "@/shared/ui";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

type KioskQuestionSummary = { is_deleted?: boolean };

function questionCount(kiosk: KioskListItem): number {
	return Array.isArray(kiosk.questions)
		? kiosk.questions.filter(
				(question: KioskQuestionSummary) => question?.is_deleted !== true,
			).length
		: 0;
}

export function KioskFormsPanel() {
	const router = useRouter();
	const { page, pageSize, search, setUrl, setPage, setPageSize } = useListUrlState();
	const [kiosks, setKiosks] = React.useState<KioskListItem[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [pagination, setPagination] = React.useState<{
		total_records: number;
		total_pages: number;
		current_page: number;
		page_size: number;
	}>({
		total_records: 0,
		total_pages: 1,
		current_page: 1,
		page_size: pageSize,
	});
	const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

	const loadKiosks = React.useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await getKiosksList({
				page,
				page_size: pageSize,
				search: search || undefined,
			});
			setKiosks(response.results ?? []);
			setPagination({
				total_records: response.total_records,
				total_pages: response.total_pages,
				current_page: response.current_page,
				page_size: response.page_size,
			});
		} catch (err: unknown) {
			const error = err as {
				response?: { data?: { detail?: string } };
				message?: string;
			};
			setError(error.response?.data?.detail || error.message || "Failed to load kiosk forms.");
		} finally {
			setLoading(false);
		}
	}, [page, pageSize, search]);

	React.useEffect(() => {
		void Promise.resolve().then(loadKiosks);
	}, [loadKiosks]);

	const commitSearch = React.useCallback(
		(value: string) => setUrl({ search: value.trim() || null, page: null }, { replace: true }),
		[setUrl],
	);

	const tableColumns = React.useMemo(() => {
		const columns = entityCol<KioskListItem>();
		return [
			columns.primary("name", "Name", (kiosk) => kiosk.name),
			columns.mono("api_name", "API Name", (kiosk) => kiosk.api_name || "—"),
			columns.tabular("questions", "Questions", (kiosk) => questionCount(kiosk)),
			columns.status(
				"status",
				"Status",
				(kiosk) => kiosk.is_active !== false,
				"Active",
				"Inactive",
			),
		];
	}, []);
	const pageRange = getListPageRange(pagination);

	return (
		<div className={listPageRootClassName()} data-list-page>
			<ListPageHeader
				controls={
					<ListPageSearchField
						value={search}
						onCommit={commitSearch}
						className="sm:max-w-sm"
					/>
				}
			/>
			<SurfaceShell className="min-h-0 flex-1 rounded-none! border-0! shadow-none! ring-0!">
				{error ? (
					<p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
				) : loading ? (
					<div className="space-y-2 p-6">
						{Array.from({ length: 6 }, (_, index) => (
							<div key={index} className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
						))}
					</div>
				) : kiosks.length === 0 ? (
					<ListPageEmptyStates
						emptyStateKind="onboarding"
						onboarding={{
							iconName: "forms",
							title: "No kiosk forms found",
							description: "Kiosk forms created in the builder will appear here.",
						}}
						onClearFilters={() => setUrl({ search: null, page: null }, { replace: true })}
					/>
				) : (
					<EntityDataTable
						columns={tableColumns}
						rows={kiosks}
						onRowClick={(kiosk) => router.push(`/kiosk-forms/${kiosk.id}`)}
						hideTextModeToggle
					/>
				)}
				{!loading && !error && kiosks.length > 0 ? (
					<DataTablePaginationBar
						pagination={pagination}
						summary={`${pageRange.start}-${pageRange.end} of ${pagination.total_records}`}
						prevLabel="Previous"
						nextLabel="Next"
						onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
						onNext={() => setPage(pagination.current_page + 1)}
						onPageSelect={setPage}
						pageSizeControl={{
							label: "Rows per page",
							listLabel: "Rows per page",
							value: pageSize,
							options: pageSizeOptions,
							onChange: setPageSize,
						}}
					/>
				) : null}
			</SurfaceShell>
		</div>
	);
}

export default KioskFormsPanel;
