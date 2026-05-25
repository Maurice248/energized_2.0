import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Only pick up unit / integration tests under src/ — exclude Playwright e2e specs
    include: ["src/**/*.test.ts"],
  },
});
