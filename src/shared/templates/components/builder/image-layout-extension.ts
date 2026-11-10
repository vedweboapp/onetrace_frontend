import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageLayoutNodeView } from "./image-layout-node-view";

export type ImageLayoutType = "single" | "two" | "three";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageLayout: {
      insertImageLayout: (options?: {
        layout?: ImageLayoutType;
        /** Per-slot src values (bare filename or full URL) */
        srcs?: string[];
        /** Per-slot alt text */
        alts?: string[];
        gap?: string;
        height?: string;
        fit?: "contain" | "cover";
      }) => ReturnType;
    };
  }
}

/**
 * Renders a static HTML preview of the image layout for PDF/export.
 */
function renderLayoutHtml(
  layout: ImageLayoutType,
  srcs: string[],
  alts: string[],
  gap: string,
  height: string,
): string {
  const count = layout === "single" ? 1 : layout === "two" ? 2 : 3;
  const imgStyle = `width:100%;height:${height};object-fit:cover;display:block;border-radius:4px;`;

  if (count === 1) {
    return `<img src="${srcs[0] || ""}" alt="${alts[0] || ""}" style="${imgStyle}" />`;
  }

  const cols = count === 2 ? "1fr 1fr" : "1fr 1fr 1fr";
  const slots = Array.from({ length: count }, (_, i) => {
    const src = srcs[i] || "";
    const alt = alts[i] || `Image ${i + 1}`;
    return `<div style="min-width:0;"><img src="${src}" alt="${alt}" style="${imgStyle}" /></div>`;
  }).join("");

  return `<div style="display:grid;grid-template-columns:${cols};gap:${gap};">${slots}</div>`;
}

export const ImageLayoutExtension = Node.create({
  name: "imageLayout",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,

  addAttributes() {
    return {
      layout: {
        default: "single" as ImageLayoutType,
        parseHTML: (element) =>
          (element.getAttribute("data-layout") as ImageLayoutType) || "single",
        renderHTML: (attributes) => ({
          "data-layout": attributes.layout || "single",
        }),
      },
      srcs: {
        default: [],
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-srcs") || "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({
          "data-srcs": JSON.stringify(attributes.srcs || []),
        }),
      },
      alts: {
        default: [],
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-alts") || "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({
          "data-alts": JSON.stringify(attributes.alts || []),
        }),
      },
      gap: {
        default: "12px",
        parseHTML: (element) => element.getAttribute("data-gap") || "12px",
        renderHTML: (attributes) => ({ "data-gap": attributes.gap || "12px" }),
      },
      height: {
        default: "200px",
        parseHTML: (element) => element.getAttribute("data-height") || "200px",
        renderHTML: (attributes) => ({ "data-height": attributes.height || "200px" }),
      },
      fit: {
        default: "contain",
        parseHTML: (element) => element.getAttribute("data-fit") || "contain",
        renderHTML: (attributes) => ({ "data-fit": attributes.fit || "contain" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-image-layout-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const layout = (HTMLAttributes["data-layout"] as ImageLayoutType) || "single";
    let srcs: string[] = [];
    try {
      srcs = typeof HTMLAttributes["data-srcs"] === "string" ? JSON.parse(HTMLAttributes["data-srcs"]) : (HTMLAttributes["data-srcs"] || []);
    } catch {
      srcs = [];
    }
    let alts: string[] = [];
    try {
      alts = typeof HTMLAttributes["data-alts"] === "string" ? JSON.parse(HTMLAttributes["data-alts"]) : (HTMLAttributes["data-alts"] || []);
    } catch {
      alts = [];
    }
    const gap = HTMLAttributes["data-gap"] || "12px";
    const height = HTMLAttributes["data-height"] || "200px";
    const fit = HTMLAttributes["data-fit"] || "contain";

    const count = layout === "single" ? 1 : layout === "two" ? 2 : 3;
    const imgStyle = `width:100%;height:${height};object-fit:${fit};display:block;border-radius:6px;`;

    if (count === 1) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-image-layout-block": "true",
          class: "image-layout-block",
          style: "width:100%;margin:14px 0;box-sizing:border-box;page-break-inside:avoid;",
        }),
        [
          "img",
          {
            src: srcs[0] || "",
            alt: alts[0] || "",
            style: imgStyle,
          },
        ],
      ];
    }

    const cols = count === 2 ? "1fr 1fr" : "1fr 1fr 1fr";
    const slotElements = Array.from({ length: count }, (_, i) => [
      "div",
      { style: "min-width:0;flex:1;" },
      [
        "img",
        {
          src: srcs[i] || "",
          alt: alts[i] || `Image ${i + 1}`,
          style: imgStyle,
        },
      ],
    ]);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-image-layout-block": "true",
        class: "image-layout-block",
        style: "width:100%;margin:14px 0;box-sizing:border-box;page-break-inside:avoid;",
      }),
      [
        "div",
        {
          class: "image-layout-grid",
          style: `display:grid;grid-template-columns:${cols};gap:${gap};width:100%;`,
        },
        ...slotElements,
      ],
    ];
  },

  addCommands() {
    return {
      insertImageLayout:
        (options = {}) =>
        ({ tr, dispatch, state }) => {
          const nodeType = state.schema.nodes.imageLayout;
          if (!nodeType) return false;

          const layout: ImageLayoutType = options.layout || "single";
          const count = layout === "single" ? 1 : layout === "two" ? 2 : 3;

          const node = nodeType.create({
            layout,
            srcs: options.srcs || Array(count).fill(""),
            alts: options.alts || Array(count).fill(""),
            gap: options.gap || "12px",
            height: options.height || "200px",
            fit: options.fit || "contain",
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
    return ReactNodeViewRenderer(ImageLayoutNodeView);
  },
});
