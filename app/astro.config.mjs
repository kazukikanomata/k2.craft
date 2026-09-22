import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import { remarkAlert } from "remark-github-blockquote-alert";
import { rehypeHeadingSpan } from "./src/libs/rehypeHeadingSpan.ts";
import { remarkAlertTitle } from "./src/libs/remarkAlertTitle.ts";
import { remarkLinkCard } from "./src/libs/remarkLinkCard.ts";

export default defineConfig({
  site: "https://k2-craft.com/",
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
  }),
  markdown: {
    // GFM(テーブル・打ち消し線・タスクリスト・URL自動リンク)はAstroの既定で有効
    syntaxHighlight: false,
    remarkPlugins: [remarkAlert, remarkAlertTitle, remarkLinkCard],
    rehypePlugins: [
      rehypeSlug,
      rehypeHeadingSpan,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          // 「#」はCSSの疑似要素で描画する(テキストにするとrender()のheadings(TOC)に混入する)
          properties: { class: "heading-anchor", ariaLabel: "この見出しへのリンク" },
          content: [],
        },
      ],
      [
        rehypePrettyCode,
        {
          theme: { light: "github-light", dark: "github-dark" },
          defaultLang: "plaintext",
          keepBackground: false,
        },
      ],
    ],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
