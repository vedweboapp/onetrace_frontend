import type { Title } from "@/features/titles/types/title.types";

type TitleNameRow = Pick<Title, "id" | "title"> & {
  site_title?: string | null;
  name?: string | null;
};

export function titleNameFromRow(row: TitleNameRow): string {
  const fromTitle = row.title?.trim();
  if (fromTitle) return fromTitle;
  const fromSiteTitle = row.site_title?.trim();
  if (fromSiteTitle) return fromSiteTitle;
  const fromName = row.name?.trim();
  if (fromName) return fromName;
  return `Title #${row.id}`;
}

export function formatTitleLabel(row: TitleNameRow): string {
  return titleNameFromRow(row);
}
