"use client";

import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const HTML_ELEMENTS = new Set([
  "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo",
  "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col",
  "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl",
  "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2",
  "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img",
  "input", "ins", "kbd", "label", "legend", "li", "link", "main", "map", "mark", "menu",
  "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p",
  "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section",
  "select", "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table",
  "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr",
  "track", "u", "ul", "var", "video", "wbr",
]);

// Track set of expanded variable tags in the current editor session
const expandedTags = new Set<string>();

export const TemplateVariablePillExtension = Extension.create({
  name: "templateVariablePill",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("templateVariablePill"),
        props: {
          decorations(state) {
            const { doc } = state;
            const decorations: Decoration[] = [];
            const regex = /<([a-zA-Z_][a-zA-Z0-9_.]*)>/g;

            doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              regex.lastIndex = 0;
              let match: RegExpExecArray | null;
              while ((match = regex.exec(node.text)) !== null) {
                const tagContent = match[1];
                if (HTML_ELEMENTS.has(tagContent.toLowerCase())) continue;

                const fullTag = match[0];
                const from = pos + match.index;
                const to = from + fullTag.length;
                const isExpanded = expandedTags.has(fullTag);

                decorations.push(
                  Decoration.inline(from, to, {
                    class: `template-var-pill ${isExpanded ? "is-expanded" : ""}`.trim(),
                    "data-tag": fullTag,
                    title: isExpanded
                      ? `${fullTag} (Click to collapse)`
                      : `${fullTag} (Click to expand full name)`,
                  }),
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement | null;
              const pill = target?.closest(".template-var-pill");
              if (pill) {
                const tag = pill.getAttribute("data-tag");
                if (tag) {
                  if (expandedTags.has(tag)) {
                    expandedTags.delete(tag);
                  } else {
                    expandedTags.add(tag);
                  }
                  // Force ProseMirror to update decorations immediately
                  view.dispatch(view.state.tr.setMeta("toggleVariableExpand", true));
                  return false;
                }
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
