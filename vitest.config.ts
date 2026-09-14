import { defineConfig } from 'vitest/config';

/**
 * Unit and component tests. Kept separate from vite.config.ts because Vitest
 * bundles its own Vite copy; sharing the app's plugin instances across the two
 * would mix incompatible Vite versions. JSX is transformed by esbuild using the
 * `jsx: react-jsx` setting from tsconfig.app.json, so no extra plugin is needed
 * here.
 */
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Playwright specs live in e2e/ and are run by `npm run test:e2e`.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
