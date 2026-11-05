import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ResizableImageView } from "./resizable-image"; 

export const TransformableImageExtension = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width") || element.style.width || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
            style: `width: ${attributes.width}`,
          };
        },
      },
      alignment: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-alignment") || "center",
        renderHTML: (attributes) => {
          if (!attributes.alignment) return {};
          return {
            "data-alignment": attributes.alignment,
          };
        },
      },
      rotate: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute("data-rotate")) || 0,
        renderHTML: (attributes) => {
          if (!attributes.rotate) return {};
          return {
            "data-rotate": attributes.rotate,
          };
        },
      },
      flipH: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-flip-h") === "true",
        renderHTML: (attributes) => {
          if (!attributes.flipH) return {};
          return {
            "data-flip-h": "true",
          };
        },
      },
      filename: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-filename") || null,
        renderHTML: (attributes) => {
          if (!attributes.filename) return {};
          return {
            "data-filename": attributes.filename,
          };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
