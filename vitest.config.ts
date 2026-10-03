import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['firebase-tests/**/*.test.ts', 'src/**/*.test.ts'], testTimeout: 15000 } });
