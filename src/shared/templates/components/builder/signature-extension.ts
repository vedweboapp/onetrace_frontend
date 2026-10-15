import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SignatureNodeView } from "./signature-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    signature: {
      insertSignature: (options?: {
        imageKey?: string;
        label?: string;
      }) => ReturnType;
    };
  }
}

export const SignatureExtension = Node.create({
  name: "signature",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,

  addAttributes() {
    return {
      imageKey: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-image-key") || "",
        renderHTML: (attributes) => ({
          "data-image-key": attributes.imageKey || "",
        }),
      },
      label: {
        default: "Client Sign",
        parseHTML: (element) => element.getAttribute("data-label") || "Client Sign",
        renderHTML: (attributes) => ({
          "data-label": attributes.label || "Client Sign",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-signature-block]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-signature-block": "true",
        class: "signature-block-placeholder",
      }),
    ];
  },

  addCommands() {
    return {
      insertSignature:
        (options = {}) =>
        ({ tr, dispatch, state }) => {
          const nodeType = state.schema.nodes.signature;
          if (!nodeType) return false;

          const node = nodeType.create({
            imageKey: options.imageKey || "",
            label: options.label || "Client Sign",
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
    return ReactNodeViewRenderer(SignatureNodeView);
  },
});
