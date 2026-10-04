import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['firebase-tests/**/*.test.ts', 'src/**/*.test.ts', 'scripts/**/*.test.mjs'], testTimeout: 15000 } });
