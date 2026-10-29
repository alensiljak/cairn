import { existsSync, readFileSync } from 'node:fs';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { defineConfig } from 'vitest/config';

// Geolocation needs a secure context. Local mkcert certificates (git-ignored) enable HTTPS for
// dev/preview, including from a phone on the LAN; without them the servers fall back to HTTP.
const keyFile = 'localhost+1-key.pem';
const certFile = 'localhost+1.pem';
const https =
	existsSync(keyFile) && existsSync(certFile)
		? { key: readFileSync(keyFile), cert: readFileSync(certFile) }
		: undefined;

export default defineConfig({
	plugins: [
		sveltekit({
			// Static SPA: all work happens client-side (GPS, wake lock, mic, OSM API).
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	server: { https, host: true },
	preview: { https, host: true },
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
