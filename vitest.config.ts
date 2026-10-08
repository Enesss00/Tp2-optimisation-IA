import { defineConfig } from "vitest/config";

// Normalisation du nommage des tests — ticket INFRA-205.
// La convention du depot est *.spec.ts.
export default defineConfig({
  test: {
    include: ["test/**/*.spec.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // server.ts ne fait qu'appeler listen() : il est couvert par `npm start`, pas par les tests.
      exclude: ["src/server.ts"],
      reporter: ["text", "json-summary"],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 }
    }
  }
});
