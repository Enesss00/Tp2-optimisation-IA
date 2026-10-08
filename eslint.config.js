import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Mise en place du lint — ticket INFRA-212.
// Socle : regles recommandees d'ESLint et de typescript-eslint. Les regles propres a
// l'equipe s'ajoutent dans le dernier bloc.
export default tseslint.config(
  { ignores: ["node_modules/", "coverage/", "reports/", ".stryker-tmp/"] },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { ecmaVersion: "latest", sourceType: "module" }
    },
    rules: {
      eqeqeq: "error",
      "no-eval": "error"
    }
  }
);
