import eslintPluginAstro from "eslint-plugin-astro";
import tsEslint from "typescript-eslint";
import globals from "globals";

export default tsEslint.config(
  ...tsEslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.ts", "**/*.astro"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    // デザインシステム: 未使用カラーパレットを禁止する(DESIGN.md「カラーパレットの制約」参照)。
    // @theme で無効化済みだが、文字列結合等の動的クラス名は @theme では防げないため
    // ESLint でも検出する。
    files: ["**/*.astro", "**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/\\b(slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+\\b/]",
          message:
            "このカラーパレットは @theme で無効化されているか、アラート(global.css)専用です。gray-* かデザインシステムのトークン(ink/muted/line/accent)を使用してください(DESIGN.md「カラーパレットの制約」参照)。",
        },
      ],
    },
  },
  {
    ignores: [".astro/**", "dist/**", "node_modules/**"],
  },
);
