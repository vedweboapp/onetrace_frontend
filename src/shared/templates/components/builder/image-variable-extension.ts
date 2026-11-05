import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageVariableNodeView } from "./image-variable-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageVariable: {
      insertImageVariable: (options: {
        imageKey: string;
        width?: string;
        scale?: number | string;
        alignment?: string;
        rotate?: number;
        flipH?: boolean;
      }) => ReturnType;
    };
  }
}

export const ImageVariableExtension = Node.create({
  name: "imageVariable",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,

  addAttributes() {
    return {
      imageKey: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("data-key") ||
          element.getAttribute("data-image-key") ||
          "",
        renderHTML: (attributes) => ({
          "data-key": attributes.imageKey || "",
        }),
      },
      width: {
        default: "360px",
        parseHTML: (element) =>
          element.getAttribute("data-width") ||
          element.style.width ||
          "360px",
        renderHTML: (attributes) => ({
          "data-width": attributes.width || "360px",
        }),
      },
      height: {
        default: "auto",
        parseHTML: (element) =>
          element.getAttribute("data-height") ||
          element.style.height ||
          "auto",
        renderHTML: (attributes) => ({
          "data-height": attributes.height || "auto",
        }),
      },
      scale: {
        default: 1,
        parseHTML: (element) => {
          const val = element.getAttribute("data-scale");
          return val ? Number(val) : 1;
        },
        renderHTML: (attributes) => ({
          "data-scale": String(attributes.scale ?? 1),
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
        parseHTML: (element) => element.getAttribute("data-flip-h") === "true",
        renderHTML: (attributes) => ({
          "data-flip-h": String(Boolean(attributes.flipH)),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-image-variable]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const key = HTMLAttributes["data-key"] || "";
    const width = HTMLAttributes["data-width"] || "360px";
    const height = HTMLAttributes["data-height"] || "auto";
    const scale = HTMLAttributes["data-scale"] || "1";
    const alignment = HTMLAttributes["data-alignment"] || "left";
    const rotate = Number(HTMLAttributes["data-rotate"]) || 0;
    const flipH =
      HTMLAttributes["data-flip-h"] === "true" ||
      HTMLAttributes["data-flip-h"] === true;

    const alignMargin =
      alignment === "center"
        ? "margin: 16px auto;"
        : alignment === "right"
          ? "margin: 16px 0 16px auto;"
          : "margin: 16px 0;";

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-image-variable": "true",
        "data-key": key,
        "data-width": width,
        "data-height": height,
        "data-scale": String(scale),
        "data-alignment": alignment,
        "data-rotate": String(rotate),
        "data-flip-h": String(flipH),
        class: "image-variable-block",
        style: `width: ${width}; height: ${height}; max-width: 100%; ${alignMargin} box-sizing: border-box; page-break-inside: avoid;`,
      }),
      [
        "div",
        {
          class: "image-variable-preview",
          style:
            "border: 2px dashed #94a3b8; border-radius: 8px; background-color: #f8fafc; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;",
        },
        [
          "span",
          {
            style:
              "font-family: monospace; font-size: 13px; font-weight: 600; color: #2563eb; background: #dbeafe; padding: 4px 10px; border-radius: 9999px;",
          },
          `<!--Image key="${key}" width="${width}" height="${height}" scale="${scale}" alignment="${alignment}" rotate="${rotate}" flipH="${flipH}" -->`,
        ],
      ],
    ];
  },

  addCommands() {
    return {
      insertImageVariable:
        (options) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: {
                imageKey: options.imageKey,
                width: options.width || "360px",
                scale: options.scale ?? 1,
                alignment: options.alignment || "left",
                rotate: options.rotate || 0,
                flipH: Boolean(options.flipH),
              },
            });
          },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageVariableNodeView);
  },
});
