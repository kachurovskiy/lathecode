import { configDefaults, defineConfig } from 'vitest/config'
import { viteSingleFile } from "vite-plugin-singlefile"
import { readFileSync } from 'node:fs'

export default defineConfig({
	plugins: [viteSingleFile(), {
    name: 'third-party-notices',
    transformIndexHtml(html) {
      const notices = readFileSync(new URL('./THIRD_PARTY_NOTICES.txt', import.meta.url), 'utf8');
      return html.replace('</html>', `<!--\n${notices.replace(/[ \t]+$/gm, '').replace(/-->/g, '-- >')}\n-->\n</html>`);
    },
  }],
  build: {
    outDir: 'docs'
  },
  // These dependencies are only reached through a worker. Prebundle them
  // before the first import so Vite does not reload the page mid-conversion.
  optimizeDeps: {include: ['occt-import-js', 'three/examples/jsm/loaders/STLLoader.js', 'polygon-clipping', '@turf/boolean-valid', 'clipper2-ts']},
	test: {
		environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'test/sample-toolpaths/**'],
	},
})
