/// <reference lib="webworker" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';

declare const self: ServiceWorkerGlobalScope;

const CACHE = `cairn-${version}`;
// SPA fallback page written by adapter-static (see vite.config.ts); it serves every route.
const SHELL = '/index.html';
const toUrl = ({ path }: { path: string }) => (path.startsWith('/') ? path : `/${path}`);
const PRECACHE = [...immutable.map(toUrl), ...assets.map(toUrl), SHELL];

// Map cache. Unversioned, so app updates keep it, and not persisted (no storage.persist()): the
// browser may evict it when storage runs low, and tiles are simply fetched again.
const MAP_CACHE = 'cairn-map';
const MAX_TILES = 3000;
const MAP_HOSTS = new Set([
	'tiles.openfreemap.org',
	'tile.openstreetmap.org',
	'server.arcgisonline.com',
	'tile.opentopomap.org'
]);
// Tile URLs end in z/x/y (or z/y/x for Esri) with an optional extension; styles, sprites and glyphs don't.
const isTile = (url: URL) => /\/\d+\/\d+\/\d+(\.\w+)?$/.test(url.pathname);
// The OpenFreeMap style and TileJSON name the current tile version, so prefer fresh copies.
const isMapIndex = (url: URL) =>
	url.hostname === 'tiles.openfreemap.org' && /^\/(styles\/[^/]+|planet)$/.test(url.pathname);

let putsSinceTrim = 0;

/** Drop the oldest tiles beyond the cap. Cache keys are in insertion order. */
async function trimTiles(cache: Cache) {
	const tiles = (await cache.keys()).filter((r) => isTile(new URL(r.url)));
	await Promise.all(
		tiles.slice(0, Math.max(0, tiles.length - MAX_TILES)).map((r) => cache.delete(r))
	);
}

async function remember(cache: Cache, request: Request, response: Response) {
	await cache.put(request, response);
	// Trimming lists every key, so do it every so often rather than on each tile.
	if (isTile(new URL(request.url)) && ++putsSinceTrim >= 50) {
		putsSinceTrim = 0;
		await trimTiles(cache);
	}
}

async function mapResponse(event: FetchEvent, url: URL): Promise<Response> {
	const { request } = event;
	const cache = await caches.open(MAP_CACHE);
	const hit = await cache.match(request);

	const fetchAndStore = async () => {
		const response = await fetch(request);
		if (response.ok) event.waitUntil(remember(cache, request, response.clone()));
		return response;
	};

	if (isMapIndex(url)) {
		try {
			return await fetchAndStore();
		} catch (err) {
			if (hit) return hit;
			throw err;
		}
	}
	return hit ?? fetchAndStore();
}

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
			.then((keys) =>
				Promise.all(keys.filter((k) => k !== CACHE && k !== MAP_CACHE).map((k) => caches.delete(k)))
			)
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

	// Map styles, tiles, sprites and glyphs: cached as they are viewed, so seen areas work offline.
	if (MAP_HOSTS.has(url.hostname)) {
		event.respondWith(mapResponse(event, url));
		return;
	}

	// Own precached assets: cache first. Everything else (OSM API) goes to the network.
	if (url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
		event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
	}
});
