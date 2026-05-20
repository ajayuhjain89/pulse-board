import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Provide the env vars config/env.js validates so importing modules that
    // depend on it (e.g. tokenService) doesn't abort the process.
    env: {
      NODE_ENV: "test",
      MONGO_URI: "mongodb://127.0.0.1:27017/pulse-board-test",
      JWT_SECRET: "test-secret-test-secret-test-secret-123456",
      GOOGLE_CLIENT_ID: "test-client-id",
    },
  },
});
