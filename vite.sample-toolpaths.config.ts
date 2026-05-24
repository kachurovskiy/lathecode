import { configDefaults, defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

const TEST_TIMEOUT_MS = getPositiveEnvNumber('SAMPLE_TOOLPATH_TIMEOUT_MS', 4 * 60 * 60 * 1000);

export default defineConfig({
  plugins: [viteSingleFile()],
  test: {
    environment: 'node',
    include: ['test/sample-toolpaths/**/*.test.ts'],
    exclude: [...configDefaults.exclude],
    hookTimeout: Math.max(30000, TEST_TIMEOUT_MS),
    testTimeout: TEST_TIMEOUT_MS,
  },
});

function getPositiveEnvNumber(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;
  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
