export type MaterialRequestExtraDispatchItem = {
  id: string;
  item: number;
  item_name?: string | null;
  quantity: number;
  dispatched_at?: string | null;
};

export type MaterialRequestDispatchLineInput = {
  line_key: string;
  quantity: number;
};

export type MaterialRequestDispatchExtraItemInput = {
  item: number;
  quantity: number;
};

export type MaterialRequestDispatchPayload = {
  lines: MaterialRequestDispatchLineInput[];
  extra_items: MaterialRequestDispatchExtraItemInput[];
};
