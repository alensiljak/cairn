<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type {
		GeoJSONSource,
		Map as MapLibreMap,
		MapMouseEvent,
		MapTouchEvent,
		Popup
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { getBasemap } from '../../lib/basemaps';
	import { settings } from '../../lib/settings.svelte';
	import { deleteMarker, listMarkers, moveMarker, toFeature, type Marker } from '../../lib/markers';

	const SOURCE = 'markers';
	const SELECTED_SOURCE = 'selected';
	const EMPTY = { type: 'FeatureCollection' as const, features: [] };
	// Voice notes in caution yellow (awaiting transcription), tagged items in go green.
	const VOICE = '#fbc02d';
	const TAGGED = '#43a047';
	// Not red: red is reserved for destructive actions.
	const SELECTED = '#1e88e5';

	let container: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let popup: Popup | undefined;
	let count = $state<number | undefined>();
	/** Id of the item being moved; the next map click sets its new position. */
	let moving = $state<number | undefined>();

	let markers: Marker[] = [];
	/** Where the pin being moved has been dragged to; saved on Done, discarded on Cancel. */
	let pending: { lng: number; lat: number } | undefined;

	const PLAY_ICON =
		'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 4l13 8-13 8z"/></svg>';
	const STOP_ICON =
		'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';

	let player: HTMLAudioElement | undefined;

	function stopPlayback() {
		if (!player) return;
		player.pause();
		URL.revokeObjectURL(player.src);
		player = undefined;
	}

	/** Plays the recording, or stops it if already playing; the button shows the next action. */
	function togglePlay(blob: Blob, button: HTMLButtonElement) {
		if (player) {
			stopPlayback();
			button.innerHTML = PLAY_ICON;
			return;
		}
		const a = new Audio(URL.createObjectURL(blob));
		player = a;
		button.innerHTML = STOP_ICON;
		const reset = () => {
			if (player !== a) return;
			stopPlayback();
			button.innerHTML = PLAY_ICON;
		};
		a.onended = reset;
		a.play().catch(reset);
	}

	/** Item awaiting delete confirmation. */
	let confirming = $state<{ id: number; label: string } | undefined>();

	async function confirmDelete() {
		if (!confirming) return;
		const { id } = confirming;
		confirming = undefined;
		await deleteMarker(id);
		markers = markers.filter((x) => x.id !== id);
		selectedId = undefined;
		popup?.remove();
		refresh();
	}

	async function finishMove(save: boolean) {
		const id = moving;
		const target = pending;
		moving = undefined;
		pending = undefined;
		const item = markers.find((x) => x.id === id);
		if (save && id !== undefined && target && item) {
			Object.assign(item, { lon: target.lng, lat: target.lat });
			await moveMarker(id, target.lng, target.lat);
		}
		refresh();
	}
	let selectedId: number | undefined;

	function label(m: Marker): string {
		return m.audio
			? 'Voice note'
			: Object.entries(m.tags)
					.map(([k, v]) => `${k}=${v}`)
					.join(' ');
	}

	/** Markers that have a position, as a GeoJSON collection for MapLibre. */
	function collection(items: Marker[]) {
		const features = items
			.filter((m) => m.lon !== null && m.lat !== null)
			.map((m) => ({
				...toFeature(m),
				properties: {
					id: m.id!,
					label: label(m),
					time: new Date(m.createdAt).toLocaleString(),
					voice: !!m.audio
				}
			}));
		return { type: 'FeatureCollection' as const, features };
	}

	/** A map pin (teardrop with a dot) whose tip is at the bottom centre of the image. */
	function pinImage(color: string, scale: number, outline: string) {
		const w = Math.round(30 * scale);
		const h = Math.round(40 * scale);
		const ratio = 2;
		const canvas = document.createElement('canvas');
		canvas.width = w * ratio;
		canvas.height = h * ratio;
		const ctx = canvas.getContext('2d')!;
		ctx.scale(ratio, ratio);
		const r = w / 2 - 2;
		const cx = w / 2;
		const cy = r + 2;
		ctx.beginPath();
		ctx.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 0.2);
		ctx.lineTo(cx, h - 1);
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.lineJoin = 'round';
		ctx.strokeStyle = outline;
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
		ctx.fillStyle = '#ffffff';
		ctx.fill();
		return { image: ctx.getImageData(0, 0, canvas.width, canvas.height), pixelRatio: ratio };
	}

	function setSelected(id: number | undefined) {
		selectedId = id;
		const source = map?.getSource(SELECTED_SOURCE) as GeoJSONSource | undefined;
		const feature = collection(markers).features.find((f) => f.properties.id === id);
		source?.setData(feature ? { type: 'FeatureCollection', features: [feature] } : EMPTY);
	}

	function refresh() {
		const data = collection(markers);
		count = data.features.length;
		(map?.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(data);
		setSelected(selectedId);
	}

	onMount(() => {
		let disposed = false;
		(async () => {
			const [maplibre, { default: workerUrl }, loaded] = await Promise.all([
				import('maplibre-gl'),
				// MapLibre looks for its worker next to its own module, which the bundler doesn't
				// emit; the host serves index.html for the missing file and the worker fails to load.
				import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
				listMarkers()
			]);
			if (disposed) return;
			maplibre.setWorkerUrl(workerUrl);

			markers = loaded;
			const data = collection(markers);
			count = data.features.length;

			const m = new maplibre.Map({
				container,
				style: getBasemap(settings.basemap).style,
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

			/** Zooms to the area covering the stored items that have a position. */
			function fitItems(animate: boolean) {
				const points = markers.filter((x) => x.lon !== null && x.lat !== null);
				if (!points.length) return;
				const bounds = new maplibre.LngLatBounds();
				for (const x of points) bounds.extend([x.lon!, x.lat!]);
				m.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: animate ? 500 : 0 });
			}

			m.addControl(
				{
					onAdd() {
						const el = document.createElement('div');
						el.className = 'maplibregl-ctrl maplibregl-ctrl-group';
						const button = document.createElement('button');
						button.type = 'button';
						button.className = 'cairn-ctrl-fit';
						button.title = 'Zoom to items';
						button.setAttribute('aria-label', 'Zoom to items');
						// Four corners (lucide "scan").
						button.innerHTML =
							'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/></svg>';
						button.onclick = () => fitItems(true);
						el.append(button);
						return el;
					},
					onRemove() {}
				},
				'top-right'
			);

			m.on('load', () => {
				for (const [name, color] of [
					['pin-voice', VOICE],
					['pin-tagged', TAGGED]
				]) {
					const { image, pixelRatio } = pinImage(color, 1, '#111111');
					m.addImage(name, image, { pixelRatio });
				}
				const sel = pinImage(SELECTED, 1.4, '#ffffff');
				m.addImage('pin-selected', sel.image, { pixelRatio: sel.pixelRatio });

				m.addSource(SOURCE, { type: 'geojson', data });
				m.addSource(SELECTED_SOURCE, { type: 'geojson', data: EMPTY });
				m.addLayer({
					id: 'markers',
					type: 'symbol',
					source: SOURCE,
					layout: {
						'icon-image': ['case', ['get', 'voice'], 'pin-voice', 'pin-tagged'],
						'icon-anchor': 'bottom',
						'icon-allow-overlap': true
					}
				});
				// Drawn above the rest so the selected pin is never hidden by its neighbours.
				m.addLayer({
					id: 'markers-selected',
					type: 'symbol',
					source: SELECTED_SOURCE,
					layout: {
						'icon-image': 'pin-selected',
						'icon-anchor': 'bottom',
						'icon-allow-overlap': true
					}
				});

				fitItems(false);
			});

			function select(id: number, lon: number, lat: number) {
				const f = collection(markers).features.find((x) => x.properties.id === id);
				if (!f) return;
				setSelected(id);
				popup?.remove();
				// Text is set via DOM nodes, never as HTML: tag values come from the user.
				const body = document.createElement('div');
				body.className = 'cairn-popup';
				const title = document.createElement('strong');
				title.textContent = f.properties.label;
				const time = document.createElement('div');
				time.className = 'cairn-popup-time';
				time.textContent = f.properties.time;
				const move = document.createElement('button');
				move.type = 'button';
				move.className = 'cairn-popup-button';
				move.title = 'Move';
				move.setAttribute('aria-label', 'Move');
				// Four-way arrows (lucide "move").
				move.innerHTML =
					'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>';
				move.onclick = () => {
					moving = id;
					// Closing the popup keeps the selection while a move is pending.
					popup?.remove();
				};
				const remove = document.createElement('button');
				remove.type = 'button';
				remove.className = 'cairn-popup-button cairn-popup-delete';
				remove.title = 'Delete';
				remove.setAttribute('aria-label', 'Delete');
				// Trash can (lucide "trash-2").
				remove.innerHTML =
					'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>';
				remove.onclick = () => {
					confirming = { id, label: f.properties.label };
				};
				const actions = document.createElement('div');
				actions.className = 'cairn-popup-actions';
				const recording = markers.find((x) => x.id === id)?.audio;
				if (recording) {
					const play = document.createElement('button');
					play.type = 'button';
					play.className = 'cairn-popup-button cairn-popup-neutral';
					play.title = 'Play voice note';
					play.setAttribute('aria-label', 'Play voice note');
					play.innerHTML = PLAY_ICON;
					play.onclick = () => togglePlay(recording, play);
					actions.append(play);
				}
				actions.append(move, remove);
				body.append(title, time, actions);
				const p = new maplibre.Popup({ offset: [0, -34], className: 'cairn-popup-root' })
					.setLngLat([lon, lat])
					.setDOMContent(body)
					.addTo(m);
				p.on('close', () => {
					stopPlayback();
					if (popup === p && moving === undefined) setSelected(undefined);
				});
				popup = p;
			}

			m.on('click', (e) => {
				if (moving !== undefined) return;
				const f = m.queryRenderedFeatures(e.point, { layers: ['markers', 'markers-selected'] })[0];
				if (!f || f.geometry.type !== 'Point') {
					popup?.remove();
					setSelected(undefined);
					return;
				}
				const [lon, lat] = f.geometry.coordinates;
				select(f.properties.id, lon, lat);
			});
			// Drag the selected pin while in move mode. The pin's tip is its position, so the grab
			// offset (pointer to tip) is kept constant instead of snapping the tip to the pointer.
			function startDrag(e: MapMouseEvent | MapTouchEvent) {
				const id = moving;
				if (id === undefined) return;
				const f = markers.find((x) => x.id === id);
				if (!f || f.lon === null || f.lat === null) return;
				e.preventDefault();
				m.dragPan.disable();
				const start = pending ?? { lng: f.lon, lat: f.lat };
				const tip = m.project([start.lng, start.lat]);
				const dx = tip.x - e.point.x;
				const dy = tip.y - e.point.y;
				const source = m.getSource(SELECTED_SOURCE) as GeoJSONSource;

				const onMove = (ev: MapMouseEvent | MapTouchEvent) => {
					const ll = m.unproject([ev.point.x + dx, ev.point.y + dy]);
					pending = { lng: ll.lng, lat: ll.lat };
					const feature = collection(markers).features.find((x) => x.properties.id === id)!;
					source.setData({
						type: 'FeatureCollection',
						features: [
							{ ...feature, geometry: { type: 'Point', coordinates: [ll.lng, ll.lat] } }
						]
					});
				};
				const onEnd = () => {
					m.off('mousemove', onMove);
					m.off('touchmove', onMove);
					m.off('mouseup', onEnd);
					m.off('touchend', onEnd);
					m.dragPan.enable();
				};
				m.on('mousemove', onMove);
				m.on('touchmove', onMove);
				m.on('mouseup', onEnd);
				m.on('touchend', onEnd);
			}
			m.on('mousedown', 'markers-selected', startDrag);
			m.on('touchstart', 'markers-selected', startDrag);

			// Set explicitly from what is under the pointer: leaving it unset falls back to MapLibre's
			// grab/grabbing cursor, which could stick after a click on a pin.
			function updateCursor(e: MapMouseEvent) {
				const layers = moving !== undefined ? ['markers-selected'] : ['markers', 'markers-selected'];
				const over = m.queryRenderedFeatures(e.point, { layers }).length > 0;
				m.getCanvas().style.cursor = over ? (moving !== undefined ? 'move' : 'pointer') : 'default';
			}
			m.on('mousemove', updateCursor);
			m.on('mouseup', updateCursor);
			m.on('click', updateCursor);
		})();

		return () => {
			disposed = true;
		};
	});

	onDestroy(() => {
		stopPlayback();
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
	{#if confirming}
		<div
			class="absolute inset-0 flex items-center justify-center bg-black/50 px-6"
			role="presentation"
			onclick={() => (confirming = undefined)}
		>
			<div
				class="w-full max-w-sm rounded-2xl bg-panel p-5 shadow-xl"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="confirm-title"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && (confirming = undefined)}
			>
				<h2 id="confirm-title" class="m-0 text-lg font-semibold">Delete item?</h2>
				<p class="mt-2 mb-4 break-words text-muted">
					"{confirming.label}" will be removed permanently.
				</p>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-lg px-4 py-2 transition active:scale-95"
						onclick={() => (confirming = undefined)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="rounded-lg bg-[#e53935] px-4 py-2 font-semibold text-white transition active:scale-95"
						onclick={confirmDelete}
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	{/if}
	{#if moving !== undefined}
		<div
			class="absolute inset-x-4 bottom-8 flex items-center justify-between gap-3 rounded-lg bg-panel/90 p-3"
		>
			<span>Drag the selected pin to its new position.</span>
			<span class="flex gap-2">
				<button
					type="button"
					class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#e53935] transition active:scale-95 text-white"
					title="Cancel"
					aria-label="Cancel"
					onclick={() => finishMove(false)}
				>
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
				</button>
				<button
					type="button"
					class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#43a047] transition active:scale-95 text-white"
					title="Done"
					aria-label="Done"
					onclick={() => finishMove(true)}
				>
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7" /></svg>
				</button>
			</span>
		</div>
	{/if}
</div>

<style>
	/* The popup is a light card; keep its text readable on the dark app theme. */
	:global(.cairn-popup-root .maplibregl-popup-content) {
		color: #111111;
		font:
			0.85rem system-ui,
			sans-serif;
		border-radius: 14px;
		padding: 12px 14px;
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
	}
	:global(.cairn-popup-root .maplibregl-popup-close-button) {
		border-radius: 0 14px 0 8px;
		font-size: 1.1rem;
		width: 26px;
		height: 26px;
	}
	:global(.cairn-popup) {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 9rem;
		padding-right: 12px;
	}
	:global(.cairn-popup-time) {
		color: #666666;
		font-size: 0.75rem;
	}
	:global(.cairn-ctrl-fit) {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	:global(.cairn-popup-actions) {
		display: flex;
		gap: 8px;
		margin-top: 6px;
	}
	:global(.cairn-popup-neutral) {
		background: #616161 !important;
		color: #ffffff !important;
	}
	:global(.cairn-popup-delete) {
		background: #e53935 !important;
		color: #ffffff !important;
	}
	:global(.cairn-popup-button) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border: 0;
		border-radius: 8px;
		background: #fbc02d;
		color: #111111;
		cursor: pointer;
		transition:
			transform 80ms ease-out,
			filter 80ms ease-out;
	}
	/* Only for real hover devices, so a touch doesn't leave the button looking stuck lit. */
	@media (hover: hover) {
		:global(.cairn-popup-button:hover) {
			filter: brightness(1.15);
			box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.3);
		}
	}
	:global(.cairn-popup-button:active) {
		transform: scale(0.9);
		filter: brightness(0.9);
	}
</style>
