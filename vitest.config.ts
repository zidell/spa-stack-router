import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			thresholds: {
				statements: 90,
				branches: 90,
				functions: 90,
				lines: 90
			}
		}
	}
});
