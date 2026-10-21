import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PinsTableNodeView } from "./pins-table-node-view";

export interface AggregateColumn {
  label: string;
  variable: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pinsTable: {
      insertPinsTable: (options?: {
        columns?: string[];
        title?: string;
        includeTotal?: boolean;
        key?: string;
        type?: string;
        module?: string;
        aggregateColumns?: AggregateColumn[];
      }) => ReturnType;
    };
  }
}

export const PinsTableExtension = Node.create({
  name: "pinsTable",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,

  addAttributes() {
    return {
      title: {
        default: "Pins List",
        parseHTML: (element) => element.getAttribute("data-title") || "Pins List",
        renderHTML: (attributes) => ({
          "data-title": attributes.title || "Pins List",
        }),
      },
      columns: {
        default: ["pin_number", "snapshot", "location", "item_name", "quantity", "status"],
        parseHTML: (element) => {
          const raw = element.getAttribute("data-columns");
          if (!raw) {
            return ["pin_number", "snapshot", "location", "item_name", "quantity", "status"];
          }
          if (raw.startsWith("[") && raw.endsWith("]")) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch {
              // fall through to comma-separated
            }
          }
          const list = raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          return list.length > 0
            ? list
            : ["pin_number", "snapshot", "location", "item_name", "quantity", "status"];
        },
        renderHTML: (attributes) => {
          const cols = Array.isArray(attributes.columns)
            ? attributes.columns
            : typeof attributes.columns === "string"
              ? attributes.columns.split(",").map((s) => s.trim()).filter(Boolean)
              : [];
          return {
            "data-columns": cols.join(","),
          };
        },
      },
      key: {
        default: "items_table",
        parseHTML: (element) => element.getAttribute("data-key") || "items_table",
        renderHTML: (attributes) => ({
          "data-key": attributes.key || "items_table",
        }),
      },
      type: {
        default: "item_table",
        parseHTML: (element) => element.getAttribute("data-type") || "item_table",
        renderHTML: (attributes) => ({
          "data-type": attributes.type || "item_table",
        }),
      },
      module: {
        default: "pins",
        parseHTML: (element) => element.getAttribute("data-module") || "pins",
        renderHTML: (attributes) => ({
          "data-module": attributes.module || "pins",
        }),
      },
      includeTotal: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-include-total") === "true",
        renderHTML: (attributes) => ({
          "data-include-total": String(Boolean(attributes.includeTotal)),
        }),
      },
      aggregateColumns: {
        default: [] as AggregateColumn[],
        parseHTML: (element) => {
          const raw = element.getAttribute("data-aggregate-columns");
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            return parsed.map((item: any) => {
              const key = item.Key || item.key || item.variable || "";
              const mod = item.Module || item.module;
              const fullVar = item.variable || (mod && !key.startsWith(`${mod}.`) ? `${mod}.${key}` : key);
              return {
                label: item.label || item.Label || "Sub-Total",
                variable: fullVar || "pins.subtotal",
              };
            });
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({
          "data-aggregate-columns": JSON.stringify(
            Array.isArray(attributes.aggregateColumns) ? attributes.aggregateColumns : []
          ),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-pins-table]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-pins-table": "true",
        class: "pins-table-placeholder",
      }),
    ];
  },

  addCommands() {
    return {
      insertPinsTable:
        (options = {}) =>
        ({ tr, dispatch, state }) => {
          const nodeType = state.schema.nodes.pinsTable;
          if (!nodeType) return false;

          const defaultCols = ["pin_number", "snapshot", "location", "item_name", "quantity", "status"];
          const cols =
            Array.isArray(options.columns) && options.columns.length > 0
              ? options.columns
              : defaultCols;
          const title = options.title || "Pins List";
          const includeTotal = Boolean(options.includeTotal);
          const key = options.key || "items_table";
          const type = options.type || "item_table";
          const aggregateColumns: AggregateColumn[] = Array.isArray(options.aggregateColumns)
            ? options.aggregateColumns
            : [];

          const node = nodeType.create({
            title,
            columns: cols,
            includeTotal,
            key,
            type,
            module,
            aggregateColumns,
          });

          if (dispatch) {
            const { selection } = state;
            const { $from } = selection;

            if ($from.parent.type.name === "paragraph" && $from.parent.content.size === 0) {
              const from = $from.before();
              const to = $from.after();
              const nextP = state.schema.nodes.paragraph.create();
              tr.replaceWith(from, to, [node, nextP]);
            } else {
              tr.replaceSelectionWith(node);
            }
            dispatch(tr.scrollIntoView());
          }
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(PinsTableNodeView);
  },
});
