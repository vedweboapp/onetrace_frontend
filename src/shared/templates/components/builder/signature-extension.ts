import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SignatureNodeView } from "./signature-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    signature: {
      insertSignature: (options?: {
        imageKey?: string;
        width?: string;
        alignment?: string;
        rotate?: number;
        flipH?: boolean;
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
        parseHTML: (element) => {
          const direct = element.getAttribute("data-image-key");
          if (direct) return direct;
          const img = element.querySelector("img");
          const src = img?.getAttribute("src") || "";
          return src.replace(/^[<]|>$|^&lt;|&gt;$/g, "").trim();
        },
        renderHTML: (attributes) => ({
          "data-image-key": attributes.imageKey || "",
        }),
      },
      width: {
        default: "320px",
        parseHTML: (element) =>
          element.getAttribute("data-width") || element.style.width || "320px",
        renderHTML: (attributes) => ({
          "data-width": attributes.width || "320px",
        }),
      },
      alignment: {
        default: "left",
        parseHTML: (element) =>
          element.getAttribute("data-alignment") || "left",
        renderHTML: (attributes) => ({
          "data-alignment": attributes.alignment || "left",
        }),
      },
      rotate: {
        default: 0,
        parseHTML: (element) =>
          Number(element.getAttribute("data-rotate")) || 0,
        renderHTML: (attributes) => ({
          "data-rotate": String(attributes.rotate || 0),
        }),
      },
      flipH: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-flip-h") === "true",
        renderHTML: (attributes) => ({
          "data-flip-h": String(Boolean(attributes.flipH)),
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
    const rawKey = HTMLAttributes["data-image-key"] || "";
    const cleanKey =
      rawKey.replace(/^[<]|>$|^&lt;|&gt;$/g, "").trim() || "signature";
    const width = HTMLAttributes["data-width"] || "320px";
    const alignment = HTMLAttributes["data-alignment"] || "left";
    const rotate = Number(HTMLAttributes["data-rotate"]) || 0;
    const flipH =
      HTMLAttributes["data-flip-h"] === "true" ||
      HTMLAttributes["data-flip-h"] === true;

    const alignMargin =
      alignment === "center"
        ? "0 auto"
        : alignment === "right"
        ? "0 0 0 auto"
        : "0";

    const transformStyle =
      rotate || flipH
        ? `transform: rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}); transform-origin: center center;`
        : "";

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-signature-block": "true",
        "data-image-key": cleanKey,
        "data-width": width,
        "data-alignment": alignment,
        "data-rotate": String(rotate),
        "data-flip-h": String(flipH),
        class: "signature-block",
        style: `width: ${width}; max-width: 100%; margin: 16px ${alignMargin.includes("auto") ? alignMargin : "0"}; box-sizing: border-box; page-break-inside: avoid;`,
      }),
      [
        "div",
        {
          class: "signature-preview-container",
          style:
            "border: 2px dashed #cbd5e1; border-radius: 8px; background-color: #f8fafc; padding: 14px; min-height: 100px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;",
        },
        [
          "img",
          {
            src: `<${cleanKey}>`,
            alt: "Signature",
            class: "signature-image",
            style: `max-width: 100%; height: auto; max-height: 120px; object-fit: contain; display: block; margin: 0 auto; ${transformStyle}`,
          },
        ],
      ],
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
            width: options.width || "320px",
            alignment: options.alignment || "left",
            rotate: options.rotate || 0,
            flipH: options.flipH || false,
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
