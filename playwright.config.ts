import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './playwright',
  timeout: 60000,
  retries: 2,
});
