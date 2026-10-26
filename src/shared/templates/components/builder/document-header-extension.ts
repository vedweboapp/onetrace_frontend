import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DocumentHeaderNodeView } from "./document-header-node-view";

export interface DocumentHeaderAttributes {
  copyToWhole?: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentHeader: {
      insertDocumentHeader: (options?: DocumentHeaderAttributes) => ReturnType;
    };
  }
}

export const DocumentHeaderExtension = Node.create({
  name: "documentHeader",
  group: "block",
  content: "block*",
  draggable: true,
  selectable: true,
  isolating: true,  // prevents content from leaking in/out at boundaries

  addAttributes() {
    return {
      copyToWhole: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-copy-to-whole") === "true",
        renderHTML: (attrs) => ({ "data-copy-to-whole": attrs.copyToWhole ? "true" : "false" }),
      },
    };
  },

  parseHTML() {
    return [
      // New format
      { tag: "header[data-document-header]" },
      // Old atom format (div-based) — for backward compatibility
      { tag: "div[data-document-header]" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "header",
      mergeAttributes(HTMLAttributes, {
        "data-document-header": "true",
        class: "document-header-block",
        style:
          "display:block; width:100%; padding-bottom:2px; margin-bottom:10px; border-bottom:1px solid #cbd5e1; box-sizing:border-box;",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocumentHeaderNodeView);
  },

  addCommands() {
    return {
      insertDocumentHeader:
        (options?: DocumentHeaderAttributes) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: options || {},
              content: [{ type: "paragraph" }],
            })
            .run();
        },
    };
  },
});
