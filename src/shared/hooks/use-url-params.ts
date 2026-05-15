"use client";

import { useMemo } from "react";
import {
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";

type DefaultParams = {
    page: number;
    page_size: number;
    search: string;
    [key: string]: string | number | undefined;
};

type ParamsValue = string | number | null | undefined;

export const useUrlParams = (
    customDefaults: Partial<DefaultParams> = {}
): [
        DefaultParams,
        (key: string, value: ParamsValue) => void,
        (newSize: number) => void
    ] => {
    const router = useRouter();

    const pathname = usePathname();

    const searchParams = useSearchParams();

    const globalDefaults: DefaultParams = {
        page: 1,
        page_size: 10,
        search: "",
    };

    const defaults: DefaultParams = {
        ...globalDefaults,
        ...customDefaults,
    };

    const params = useMemo(() => {
        const result: DefaultParams = { ...defaults };

        for (const key of Object.keys(defaults)) {
            const urlValue = searchParams.get(key);

            if (urlValue === null) continue;

            if (key === "page" || key === "page_size") {
                const num = Number(urlValue);

                if (!Number.isFinite(num) || num <= 0) continue;

                result[key] = num;
            } else {
                result[key] = urlValue;
            }
        }

        return result;
    }, [searchParams, defaults]);

    const updateParams = (newParams: URLSearchParams) => {
        router.push(`${pathname}?${newParams.toString()}`);
    };

    const setParam = (
        key: string,
        value: ParamsValue
    ) => {
        const newParams = new URLSearchParams(
            searchParams.toString()
        );

        if (value === null || value === undefined) {
            newParams.delete(key);
        } else {
            newParams.set(key, String(value));
        }

        updateParams(newParams);
    };

    const setPageSize = (newSize: number) => {
        const currentPage =
            Number(searchParams.get("page")) || 1;

        const currentPageSize =
            Number(searchParams.get("page_size")) || 10;

        const currentFirstRecord =
            (currentPage - 1) * currentPageSize + 1;

        const newPage = Math.ceil(
            currentFirstRecord / newSize
        );

        const newParams = new URLSearchParams(
            searchParams.toString()
        );

        newParams.set("page_size", String(newSize));

        newParams.set("page", String(newPage));

        updateParams(newParams);
    };

    return [params, setParam, setPageSize];
};