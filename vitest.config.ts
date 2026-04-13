import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const rootDir = path.dirname(fileURLToPath(new URL(import.meta.url)))

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    include: ["__tests__/**/*.test.ts"],
    maxWorkers: 1,
    passWithNoTests: true,
    setupFiles: ["./__tests__/helpers/setup.ts"],
    testTimeout: 30000,
  },
})
