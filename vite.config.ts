import { defineConfig } from 'vitest/config'
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
	plugins: [viteSingleFile()],
	test: {
		environment: 'jsdom',
	},
})
