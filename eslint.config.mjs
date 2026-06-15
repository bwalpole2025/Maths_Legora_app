// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/*.tsbuildinfo",
      "services/**", // Python service, linted separately
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
