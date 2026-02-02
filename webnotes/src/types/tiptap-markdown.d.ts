import "@tiptap/react";

declare module "@tiptap/react" {
  interface Editor {
    storage: {
      markdown?: {
        getMarkdown: () => string;
      };
      [key: string]: unknown;
    };
  }
}

declare module "tiptap-markdown" {
  import { Extension } from "@tiptap/core";

  export interface MarkdownOptions {
    html?: boolean;
    tightLists?: boolean;
    tightListClass?: string;
    bulletListMarker?: "-" | "*" | "+";
    linkify?: boolean;
    breaks?: boolean;
    transformPastedText?: boolean;
    transformCopiedText?: boolean;
  }

  export interface MarkdownStorage {
    getMarkdown: () => string;
  }

  export const Markdown: Extension<MarkdownOptions, MarkdownStorage>;
}
