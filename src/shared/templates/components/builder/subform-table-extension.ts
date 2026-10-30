import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SubformTableNodeView } from "./subform-table-node-view";
import type { SubformConfig } from "./subform-modal";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    subformTable: {
      insertSubformTable: (options?: Partial<SubformConfig>) => ReturnType;
    };
  }
}

export const SubformTableExtension = Node.create({
  name: "subformTable",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,

  addAttributes() {
    return {
      title: {
        default: "Subform Table",
        parseHTML: (element) => element.getAttribute("data-title") || "Subform Table",
        renderHTML: (attributes) => ({
          "data-title": attributes.title || "Subform Table",
        }),
      },
      key: {
        default: "subform",
        parseHTML: (element) => element.getAttribute("data-key") || "subform",
        renderHTML: (attributes) => ({
          "data-key": attributes.key || "subform",
        }),
      },
      type: {
        default: "subformtable",
        parseHTML: (element) => element.getAttribute("data-type") || "subformtable",
        renderHTML: (attributes) => ({
          "data-type": attributes.type || "subformtable",
        }),
      },
      module: {
        default: "sections",
        parseHTML: (element) => element.getAttribute("data-module") || "sections",
        renderHTML: (attributes) => ({
          "data-module": attributes.module || "sections",
        }),
      },
      columns: {
        default: ["name", "description", "status", "created_at"],
        parseHTML: (element) => {
          const raw = element.getAttribute("data-columns");
          if (!raw) return ["name", "description", "status", "created_at"];
          if (raw.startsWith("[") && raw.endsWith("]")) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch {
              // fall through
            }
          }
          const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
          return list.length > 0 ? list : ["name", "description", "status", "created_at"];
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
      columnLabels: {
        default: {},
        parseHTML: (element) => {
          const raw = element.getAttribute("data-column-labels");
          if (!raw) return {};
          try {
            return JSON.parse(raw);
          } catch {
            return {};
          }
        },
        renderHTML: (attributes) => ({
          "data-column-labels": JSON.stringify(attributes.columnLabels || {}),
        }),
      },
      includeHeading: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-include-heading") !== "false",
        renderHTML: (attributes) => ({
          "data-include-heading": String(attributes.includeHeading !== false),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-subform-table]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-subform-table": "true",
        class: "subform-table-placeholder",
      }),
    ];
  },

  addCommands() {
    return {
      insertSubformTable:
        (options = {}) =>
        ({ tr, dispatch, state }) => {
          const nodeType = state.schema.nodes.subformTable;
          if (!nodeType) return false;

          const title = options.title || "Subform Table";
          const key = options.key || "subform";
          const moduleName = options.module || "sections";
          const type = options.type || "subformtable";
          const columns = Array.isArray(options.columns) ? options.columns : [];
          const columnLabels = options.columnLabels || {};
          const includeHeading = options.includeHeading !== false;

          const node = nodeType.create({
            title,
            key,
            type,
            module: moduleName,
            columns,
            columnLabels,
            includeHeading,
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
    return ReactNodeViewRenderer(SubformTableNodeView);
  },
});
