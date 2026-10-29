<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Map as MapLibreMap, Popup } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { listMarkers, toFeature, type Marker } from '../../lib/markers';

	const SOURCE = 'markers';
	// Online-only for now. The OSM tile servers are for light use (see their tile usage policy);
	// switch to a dedicated tile provider before wide distribution.
	const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

	let container: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let popup: Popup | undefined;
	let count = $state<number | undefined>();

	function label(m: Marker): string {
		return m.audio
			? 'Voice note'
			: Object.entries(m.tags)
					.map(([k, v]) => `${k}=${v}`)
					.join(' ');
	}

	/** Markers that have a position, as a GeoJSON collection for MapLibre. */
	function collection(markers: Marker[]) {
		const features = markers
			.filter((m) => m.lon !== null && m.lat !== null)
			.map((m) => ({
				...toFeature(m),
				properties: {
					label: label(m),
					time: new Date(m.createdAt).toLocaleString(),
					voice: !!m.audio
				}
			}));
		return { type: 'FeatureCollection' as const, features };
	}

	onMount(() => {
		let disposed = false;
		(async () => {
			const [maplibre, { default: workerUrl }, markers] = await Promise.all([
				import('maplibre-gl'),
				// MapLibre looks for its worker next to its own module, which the bundler doesn't
				// emit; the host serves index.html for the missing file and the worker fails to load.
				import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
				listMarkers()
			]);
			if (disposed) return;
			maplibre.setWorkerUrl(workerUrl);

			const data = collection(markers);
			count = data.features.length;

			const m = new maplibre.Map({
				container,
				style: {
					version: 8,
					sources: {
						osm: {
							type: 'raster',
							tiles: [TILES],
							tileSize: 256,
							maxzoom: 19,
							attribution:
								'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
						}
					},
					layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
				},
				center: [0, 20],
				zoom: 1.5,
				attributionControl: { compact: true }
			});
			map = m;

			m.addControl(new maplibre.NavigationControl({ showCompass: true }), 'top-right');
			m.addControl(
				new maplibre.GeolocateControl({
					positionOptions: { enableHighAccuracy: true },
					trackUserLocation: true,
					showAccuracyCircle: false
				}),
				'top-right'
			);

			m.on('load', () => {
				m.addSource(SOURCE, { type: 'geojson', data });
				m.addLayer({
					id: 'markers',
					type: 'circle',
					source: SOURCE,
					paint: {
						'circle-radius': 8,
						// Voice notes in caution yellow (awaiting transcription), tagged items in go green.
						'circle-color': ['case', ['get', 'voice'], '#fbc02d', '#43a047'],
						'circle-stroke-width': 2,
						'circle-stroke-color': '#111111'
					}
				});

				if (data.features.length) {
					const bounds = new maplibre.LngLatBounds();
					for (const f of data.features) bounds.extend(f.geometry!.coordinates as [number, number]);
					m.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 0 });
				}
			});

			m.on('click', 'markers', (e) => {
				const f = e.features?.[0];
				if (!f || f.geometry.type !== 'Point') return;
				const [lon, lat] = f.geometry.coordinates;
				popup?.remove();
				// Text is set via DOM nodes, never as HTML: tag values come from the user.
				const body = document.createElement('div');
				const title = document.createElement('strong');
				title.textContent = f.properties.label;
				const time = document.createElement('div');
				time.textContent = f.properties.time;
				body.append(title, time);
				popup = new maplibre.Popup({ offset: 12 })
					.setLngLat([lon, lat])
					.setDOMContent(body)
					.addTo(m);
			});
			m.on('mouseenter', 'markers', () => (m.getCanvas().style.cursor = 'pointer'));
			m.on('mouseleave', 'markers', () => (m.getCanvas().style.cursor = ''));
		})();

		return () => {
			disposed = true;
		};
	});

	onDestroy(() => {
		popup?.remove();
		map?.remove();
		map = undefined;
	});
</script>

<div class="relative h-full">
	<!-- Sized, not positioned: maplibre-gl.css sets `position: relative` on the map and, being
		unlayered, would override Tailwind's `absolute inset-0` and collapse the height to 0. -->
	<div bind:this={container} class="h-full w-full"></div>
	{#if count === 0}
		<p
			class="pointer-events-none absolute inset-x-4 top-4 m-0 rounded-lg bg-panel/90 p-3 text-center text-muted"
		>
			No items with a position yet.
		</p>
	{/if}
</div>

<style>
	/* The popup is MapLibre's own light card; keep its text readable on the dark app theme. */
	:global(.maplibregl-popup-content) {
		color: #111111;
		font:
			0.85rem system-ui,
			sans-serif;
	}
</style>
