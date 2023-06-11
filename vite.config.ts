import { defineConfig } from 'vitest/config'
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
	plugins: [viteSingleFile()],
  build: {
    outDir: 'docs'
  },
	test: {
		environment: 'jsdom',
	},
})
