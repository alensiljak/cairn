/// <reference lib="webworker" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';

declare const self: ServiceWorkerGlobalScope;

const CACHE = `cairn-${version}`;
// SPA fallback page written by adapter-static (see vite.config.ts); it serves every route.
const SHELL = '/index.html';
const toUrl = ({ path }: { path: string }) => (path.startsWith('/') ? path : `/${path}`);
const PRECACHE = [...immutable.map(toUrl), ...assets.map(toUrl), SHELL];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	// Navigations: every route is the SPA shell. Fall back to the network only if it is missing.
	if (request.mode === 'navigate' && url.origin === self.location.origin) {
		event.respondWith(caches.match(SHELL).then((hit) => hit ?? fetch(request)));
		return;
	}

	// Own precached assets: cache first. Everything else (map tiles, OSM API) goes to the network.
	if (url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
		event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
	}
});
