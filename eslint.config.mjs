import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Disable ESLint rules that conflict with Prettier formatting.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Ban arbitrary hex colors in className (e.g. bg-[#fff], text-[#0054C7]).
      // Always use design tokens from globals.css instead.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\[#[0-9a-fA-F]/]",
          message:
            "Do not use arbitrary hex colors (e.g. bg-[#fff]). Use a design token from globals.css.",
        },
      ],
    },
  },
]);

export default eslintConfig;
