import { defineConfig } from 'vite';

export default defineConfig({
	base: process.env.GITHUB_PAGES === 'true' ? '/spa-stack-router/' : '/',
	root: 'demo',
	build: {
		outDir: '../demo-dist',
		emptyOutDir: true
	}
});
