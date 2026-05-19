"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";

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

    const globalDefaults = useMemo<DefaultParams>(() => ({
        page: 1,
        page_size: 10,
        search: "",
    }), []);

    const customDefaultsSerialized = JSON.stringify(customDefaults);
    const defaults = useMemo<DefaultParams>(() => ({
        ...globalDefaults,
        ...customDefaults,
    }), [globalDefaults, customDefaultsSerialized]);

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

    const updateParams = useCallback((newParams: URLSearchParams) => {
        router.push(`${pathname}?${newParams.toString()}`);
    }, [router, pathname]);

    const setParam = useCallback((
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
    }, [searchParams, updateParams]);

    const setPageSize = useCallback((newSize: number) => {
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
    }, [searchParams, updateParams]);

    return [params, setParam, setPageSize];
};