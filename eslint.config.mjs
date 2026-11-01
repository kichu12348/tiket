import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "**/node_modules/**",
    ".next/**",
    "**/.next/**",
    "dist/**",
    "**/dist/**",
    "build/**",
    "**/build/**",
    "out/**",
    "**/out/**",
    "**/*.d.ts",
    "**/next-env.d.ts",
    "tiket-backend/drizzle/**",
  ]),
  // Frontend Next.js configs
  ...nextVitals.map((config) => ({
    ...config,
    files: ["tiket-frontend/**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
  })),
  ...nextTs.map((config) => ({
    ...config,
    files: ["tiket-frontend/**/*.{ts,tsx,mts,cts}"],
  })),
  // Backend config
  {
    files: ["tiket-backend/src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
  },
  // Common rule configuration across both
  {
    files: ["tiket-backend/src/**/*.ts", "tiket-frontend/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
