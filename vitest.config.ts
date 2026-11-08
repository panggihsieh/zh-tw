import { defineConfig } from "vitest/config";
// Independent subprojects use node:test; the main app suite contains Vitest tests.
export default defineConfig({ test: { include: ["src/**/*.test.{ts,tsx}"] } });
