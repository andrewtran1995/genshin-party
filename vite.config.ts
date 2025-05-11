import { defineConfig } from 'vitest/config'

// biome-ignore lint/style/noDefaultExport: Exporting a default is expected by Vite.
export default defineConfig({
	test: {
		root: './src',
	},
})
