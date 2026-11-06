// Lint focado em segurança (não altera o estilo do projeto). Rodar: npm run lint:security
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "public/**", "scripts/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    linterOptions: { noInlineConfig: true },
    plugins: { security },
    rules: { ...security.configs.recommended.rules },
  },
);
