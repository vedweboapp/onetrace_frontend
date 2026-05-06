/** 1-based inclusive range for the current page of a paginated list. */
export function getListPageRange(p: {
  current_page: number;
  page_size: number;
  total_records: number;
}): { start: number; end: number } {
  if (p.total_records <= 0) return { start: 0, end: 0 };
  const start = (p.current_page - 1) * p.page_size + 1;
  const end = Math.min(p.current_page * p.page_size, p.total_records);
  return { start, end };
}
