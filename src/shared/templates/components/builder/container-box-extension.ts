import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ContainerBoxNodeView } from "./container-box-node-view";

export interface ContainerBoxAttributes {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  borderRadius?: string;
  padding?: string;
  width?: string;
  minHeight?: string;
  marginLeft?: string;
  alignment?: "left" | "center" | "right";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    containerBox: {
      insertContainerBox: (options?: ContainerBoxAttributes) => ReturnType;
    };
  }
}

export const ContainerBoxExtension = Node.create({
  name: "containerBox",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      backgroundColor: {
        default: "#f8fafc",
        parseHTML: (element) =>
          element.getAttribute("data-bg-color") ||
          element.style.backgroundColor ||
          "#f8fafc",
        renderHTML: (attributes) => ({
          "data-bg-color": attributes.backgroundColor || "#f8fafc",
        }),
      },
      borderColor: {
        default: "#cbd5e1",
        parseHTML: (element) =>
          element.getAttribute("data-border-color") ||
          element.style.borderColor ||
          "#cbd5e1",
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor || "#cbd5e1",
        }),
      },
      borderWidth: {
        default: "1px",
        parseHTML: (element) =>
          element.getAttribute("data-border-width") ||
          element.style.borderWidth ||
          "1px",
        renderHTML: (attributes) => ({
          "data-border-width": attributes.borderWidth || "1px",
        }),
      },
      borderStyle: {
        default: "solid",
        parseHTML: (element) =>
          (element.getAttribute("data-border-style") as any) ||
          element.style.borderStyle ||
          "solid",
        renderHTML: (attributes) => ({
          "data-border-style": attributes.borderStyle || "solid",
        }),
      },
      borderRadius: {
        default: "8px",
        parseHTML: (element) =>
          element.getAttribute("data-border-radius") ||
          element.style.borderRadius ||
          "8px",
        renderHTML: (attributes) => ({
          "data-border-radius": attributes.borderRadius || "8px",
        }),
      },
      padding: {
        default: "6px 10px",
        parseHTML: (element) =>
          element.getAttribute("data-padding") ||
          element.style.padding ||
          "6px 10px",
        renderHTML: (attributes) => ({
          "data-padding": attributes.padding || "6px 10px",
        }),
      },
      width: {
        default: "100%",
        parseHTML: (element) =>
          element.getAttribute("data-width") || element.style.width || "100%",
        renderHTML: (attributes) => ({
          "data-width": attributes.width || "100%",
        }),
      },
      minHeight: {
        default: "32px",
        parseHTML: (element) =>
          element.getAttribute("data-min-height") ||
          element.style.minHeight ||
          "32px",
        renderHTML: (attributes) => ({
          "data-min-height": attributes.minHeight || "32px",
        }),
      },
      marginLeft: {
        default: "0px",
        parseHTML: (element) =>
          element.getAttribute("data-margin-left") ||
          element.style.marginLeft ||
          "0px",
        renderHTML: (attributes) => ({
          "data-margin-left": attributes.marginLeft || "0px",
        }),
      },
      alignment: {
        default: "left",
        parseHTML: (element) =>
          (element.getAttribute("data-alignment") as any) || "left",
        renderHTML: (attributes) => ({
          "data-alignment": attributes.alignment || "left",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-container-box]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const bgColor = HTMLAttributes["data-bg-color"] || "#f8fafc";
    const borderColor = HTMLAttributes["data-border-color"] || "#cbd5e1";
    const borderWidth = HTMLAttributes["data-border-width"] || "1px";
    const borderStyle = HTMLAttributes["data-border-style"] || "solid";
    const borderRadius = HTMLAttributes["data-border-radius"] || "8px";
    const padding = HTMLAttributes["data-padding"] || "16px";
    const width = HTMLAttributes["data-width"] || "100%";
    const minHeight = HTMLAttributes["data-min-height"] || "64px";
    const marginLeft = HTMLAttributes["data-margin-left"] || "0px";
    const alignment = HTMLAttributes["data-alignment"] || "left";

    let margin = "12px 0";
    if (alignment === "center") {
      margin = "12px auto";
    } else if (alignment === "right") {
      margin = "12px 0 12px auto";
    } else if (marginLeft && marginLeft !== "0px") {
      margin = `12px 0 12px ${marginLeft}`;
    }

    const borderCss =
      borderStyle === "none"
        ? "none"
        : `${borderWidth} ${borderStyle} ${borderColor}`;

    const style = [
      `background-color: ${bgColor}`,
      `border: ${borderCss}`,
      `border-radius: ${borderRadius}`,
      `padding: ${padding}`,
      `width: ${width}`,
      `min-height: ${minHeight}`,
      `max-width: 100%`,
      `box-sizing: border-box`,
      `margin: ${margin}`,
      `display: block`,
    ].join("; ");

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-container-box": "true",
        class: "container-box-block",
        style,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ContainerBoxNodeView);
  },

  addCommands() {
    return {
      insertContainerBox:
        (options?: ContainerBoxAttributes) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: options || {},
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Click here to add text, headings, variables, or other content in this box...",
                    },
                  ],
                },
              ],
            })
            .focus()
            .run();
        },
    };
  },
});
