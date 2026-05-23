import { configDefaults, defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  test: {
    environment: 'node',
    include: ['test/sample-toolpaths/**/*.test.ts'],
    exclude: [...configDefaults.exclude],
    hookTimeout: 30000,
    testTimeout: 3600000,
  },
});
