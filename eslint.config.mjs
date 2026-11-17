import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "**/node_modules/**",
    ".next/**",
    "**/.next/**",
    ".output/**",
    "**/.output/**",
    "dist/**",
    "**/dist/**",
    "build/**",
    "**/build/**",
    "out/**",
    "**/out/**",
    "**/*.d.ts",
    "tiket-frontend/app/routeTree.gen.ts",
    "tiket-backend/drizzle/**",
    "tiket-backend/tests/**",
  ]),
  {
    files: ["tiket-backend/src/**/*.ts", "tiket-frontend/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
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
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
