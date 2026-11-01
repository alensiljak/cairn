<script lang="ts">
	import { flushSync, mount, onDestroy, onMount, unmount } from 'svelte';
	import { roadsideFeatureOf } from '../../lib/presets';
	import MarkerIcon from '../../lib/MarkerIcon.svelte';
	import type {
		GeoJSONSource,
		Map as MapLibreMap,
		MapMouseEvent,
		MapTouchEvent,
		Popup
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { getBasemap } from '../../lib/basemaps';
	import NoteDialog from '../../lib/NoteDialog.svelte';
	import { osmUrl } from '../../lib/osm.svelte';
	import { settings } from '../../lib/settings.svelte';
	import { canUpload, uploadMarker } from '../../lib/upload';
	import {
		addMarker,
		deleteMarker,
		listMarkers,
		markerLabel,
		moveMarker,
		setNote,
		toFeature,
		type Marker
	} from '../../lib/markers';

	const SOURCE = 'markers';
	const SELECTED_SOURCE = 'selected';
	const EMPTY = { type: 'FeatureCollection' as const, features: [] };
	// Voice notes in caution yellow (awaiting transcription), tagged items in go green.
	const VOICE = '#fbc02d';
	const TAGGED = '#43a047';
	// Uploaded as OSM notes: nothing left to do in the app, so muted.
	const UPLOADED = '#9e9e9e';
	const UPLOADED_SUFFIX = '-done';
	// Not red: red is reserved for destructive actions.
	const SELECTED = '#1e88e5';
	const POINTER = '#e53935';
	// Pins are large enough for the pictogram to be recognisable.
	const PIN_SCALE = 1.3;
	const SELECTED_SCALE = 1.7;

	let container: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let popup: Popup | undefined;
	let count = $state<number | undefined>();
	/** Id of the item being moved; the next map click sets its new position. */
	let moving = $state<number | undefined>();

	/** Brief message (upload result or error) shown over the map. */
	let status = $state<string | undefined>();
	let statusTimer: ReturnType<typeof setTimeout> | undefined;

	function showStatus(message: string) {
		status = message;
		clearTimeout(statusTimer);
		statusTimer = setTimeout(() => (status = undefined), 5000);
	}

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

	/** Green while playing, the regular colour otherwise; the icon shows the next action. */
	function showPlaying(button: HTMLButtonElement, playing: boolean) {
		button.innerHTML = playing ? STOP_ICON : PLAY_ICON;
		button.classList.toggle('cairn-popup-playing', playing);
	}

	/** Plays the recording, or stops it if already playing. */
	function togglePlay(blob: Blob, button: HTMLButtonElement) {
		if (player) {
			stopPlayback();
			showPlaying(button, false);
			return;
		}
		const a = new Audio(URL.createObjectURL(blob));
		player = a;
		showPlaying(button, true);
		const reset = () => {
			if (player !== a) return;
			stopPlayback();
			showPlaying(button, false);
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

	const POINTER_SOURCE = 'pointer';
	/** Spot tapped on the map where a manual note can be added. */
	let pointer = $state<{ lng: number; lat: number } | undefined>();
	/**
	 * The note dialog: a new note at the pointer, or (with `id`) the transcript of a voice note.
	 * Undefined while it is closed.
	 */
	let noteDialog = $state<{ title: string; text: string; id?: number } | undefined>();

	function setPointer(at: { lng: number; lat: number } | undefined) {
		pointer = at;
		const source = map?.getSource(POINTER_SOURCE) as GeoJSONSource | undefined;
		source?.setData(
			at
				? {
						type: 'FeatureCollection',
						features: [
							{
								type: 'Feature',
								geometry: { type: 'Point', coordinates: [at.lng, at.lat] },
								properties: {}
							}
						]
					}
				: EMPTY
		);
	}

	async function saveNote() {
		const text = noteDialog?.text.trim() ?? '';
		const id = noteDialog?.id;
		noteDialog = undefined;
		if (id !== undefined) {
			await setNote(id, text);
			const item = markers.find((x) => x.id === id);
			if (item) {
				const { note: _, ...tags } = item.tags;
				item.tags = text ? { ...tags, note: text } : tags;
			}
			return;
		}
		const at = pointer;
		if (!text || !at) return;
		const marker = {
			tags: { note: text },
			lon: at.lng,
			lat: at.lat,
			accuracy: null,
			heading: null,
			speed: null
		};
		const newId = await addMarker(marker);
		markers = [{ ...marker, id: newId, createdAt: Date.now() }, ...markers];
		setPointer(undefined);
		refresh();
	}

	/** Markers that have a position, as a GeoJSON collection for MapLibre. */
	function collection(items: Marker[]) {
		const features = items
			.filter((m) => m.lon !== null && m.lat !== null)
			.map((m) => ({
				...toFeature(m),
				properties: {
					id: m.id!,
					label: markerLabel(m),
					time: new Date(m.createdAt).toLocaleString(),
					pin: pinKey(m)
				}
			}));
		return { type: 'FeatureCollection' as const, features };
	}

	/** Which pin image a marker uses; the same key means the same pictogram. */
	function pinKey(m: Marker): string {
		return pinBase(m) + (m.uploadedAt ? UPLOADED_SUFFIX : '');
	}

	function pinBase(m: Marker): string {
		if (m.audio) return 'voice';
		if (m.tags.note) return 'note';
		if (m.tags.traffic_sign === 'maxspeed' && m.tags.maxspeed) return `speed-${m.tags.maxspeed}`;
		return roadsideFeatureOf(m.tags)?.id ?? 'tagged';
	}

	/** The marker's pictogram (as shown on its button) rendered to an image; undefined if it has none. */
	async function glyphImage(marker: Marker): Promise<HTMLImageElement | undefined> {
		const box = document.createElement('div');
		const component = mount(MarkerIcon, { target: box, props: { marker } });
		flushSync();
		const svg = box.querySelector('svg');
		let xml: string | undefined;
		if (svg) {
			svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
			svg.setAttribute('width', '96');
			svg.setAttribute('height', '96');
			xml = new XMLSerializer().serializeToString(svg).replaceAll('currentColor', '#111111');
		}
		unmount(component);
		if (!xml) return undefined;
		const img = new Image();
		img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
		try {
			await img.decode();
			return img;
		} catch {
			return undefined;
		}
	}

	/** Adds the pin images (normal and selected) for markers whose pictogram has none yet. */
	async function ensurePins(m: MapLibreMap, items: Marker[]) {
		const todo = new Map<string, Marker>();
		for (const item of items) {
			const key = pinKey(item);
			if (!todo.has(key) && !m.hasImage(`pin-${key}`)) todo.set(key, item);
		}
		for (const [key, item] of todo) {
			const glyph = await glyphImage(item);
			const color = key.endsWith(UPLOADED_SUFFIX) ? UPLOADED : key === 'voice' ? VOICE : TAGGED;
			const round = key.startsWith('speed-');
			const gray = key.endsWith(UPLOADED_SUFFIX);
			const pin = pinImage(color, PIN_SCALE, '#111111', glyph, round, gray);
			const sel = pinImage(SELECTED, SELECTED_SCALE, '#ffffff', glyph, round, gray);
			if (m.hasImage(`pin-${key}`)) continue;
			m.addImage(`pin-${key}`, pin.image, { pixelRatio: pin.pixelRatio });
			m.addImage(`pin-sel-${key}`, sel.image, { pixelRatio: sel.pixelRatio });
		}
	}

	/** A map pin (teardrop with a pictogram) whose tip is at the bottom centre of the image. */
	function pinImage(
		color: string,
		scale: number,
		outline: string,
		glyph?: HTMLImageElement,
		round = false,
		gray = false
	) {
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
		ctx.arc(cx, cy, r * (glyph ? 0.8 : 0.38), 0, Math.PI * 2);
		ctx.fillStyle = '#ffffff';
		ctx.fill();
		if (glyph) {
			// A round sign fills the disc edge to edge; a rectangular one must fit inside it.
			const side = r * (round ? 1.65 : 1.4);
			ctx.drawImage(glyph, cx - side / 2, cy - side / 2, side, side);
			if (gray) desaturate(ctx, cx, cy, side, ratio);
		}
		return { image: ctx.getImageData(0, 0, canvas.width, canvas.height), pixelRatio: ratio };
	}

	/** Turns the pictogram just drawn (a square of the given side around the centre) to greyscale. */
	function desaturate(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		side: number,
		ratio: number
	) {
		const x = Math.floor((cx - side / 2) * ratio);
		const y = Math.floor((cy - side / 2) * ratio);
		const size = Math.ceil(side * ratio);
		const data = ctx.getImageData(x, y, size, size);
		const px = data.data;
		for (let i = 0; i < px.length; i += 4) {
			const l = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
			px[i] = px[i + 1] = px[i + 2] = l;
		}
		ctx.putImageData(data, x, y);
	}

	function setSelected(id: number | undefined) {
		selectedId = id;
		const source = map?.getSource(SELECTED_SOURCE) as GeoJSONSource | undefined;
		const feature = collection(markers).features.find((f) => f.properties.id === id);
		source?.setData(feature ? { type: 'FeatureCollection', features: [feature] } : EMPTY);
	}

	async function refresh() {
		const data = collection(markers);
		count = data.features.length;
		if (map) await ensurePins(map, markers);
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

			m.on('load', async () => {
				await ensurePins(m, markers);
				if (disposed) return;

				m.addSource(SOURCE, { type: 'geojson', data });
				m.addSource(SELECTED_SOURCE, { type: 'geojson', data: EMPTY });
				m.addSource(POINTER_SOURCE, { type: 'geojson', data: EMPTY });
				const red = pinImage(POINTER, PIN_SCALE, '#111111');
				m.addImage('pin-pointer', red.image, { pixelRatio: red.pixelRatio });
				m.addLayer({
					id: 'pointer',
					type: 'symbol',
					source: POINTER_SOURCE,
					layout: {
						'icon-image': 'pin-pointer',
						'icon-anchor': 'bottom',
						'icon-allow-overlap': true
					}
				});
				m.addLayer({
					id: 'markers',
					type: 'symbol',
					source: SOURCE,
					layout: {
						'icon-image': ['concat', 'pin-', ['get', 'pin']],
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
						'icon-image': ['concat', 'pin-sel-', ['get', 'pin']],
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
				const item = markers.find((x) => x.id === id);
				if (item?.audio && !item.uploadedAt) {
					const transcribe = document.createElement('button');
					transcribe.type = 'button';
					transcribe.className = 'cairn-popup-button';
					transcribe.title = 'Transcribe';
					transcribe.setAttribute('aria-label', 'Transcribe');
					// Pencil (lucide "pencil").
					transcribe.innerHTML =
						'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
					transcribe.onclick = () => {
						stopPlayback();
						noteDialog = { title: 'Transcribe', text: item.tags.note ?? '', id };
					};
					actions.append(transcribe);
				}
				if (item?.uploadedAt) {
					const note = document.createElement('a');
					note.className = 'cairn-popup-button cairn-popup-link';
					note.href = `${osmUrl}/note/${item.noteId}`;
					note.target = '_blank';
					note.rel = 'noreferrer';
					note.title = 'Open the OSM note';
					note.textContent = 'Note';
					actions.append(note);
				} else if (item && canUpload(item)) {
					const upload = document.createElement('button');
					upload.type = 'button';
					upload.className = 'cairn-popup-button';
					upload.title = 'Upload as OSM note';
					upload.setAttribute('aria-label', 'Upload as OSM note');
					// Tray with an arrow up (lucide "upload").
					upload.innerHTML =
						'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>';
					upload.onclick = async () => {
						upload.disabled = true;
						try {
							// Without a login this leaves for OSM's sign-in page.
							if (await uploadMarker(item)) {
								showStatus(`Uploaded as note #${item.noteId}.`);
								select(id, lon, lat);
							}
						} catch (e) {
							showStatus(e instanceof Error ? e.message : String(e));
						}
						upload.disabled = false;
					};
					actions.append(upload);
				}
				actions.append(move, remove);
				const text = document.createElement('div');
				text.className = 'cairn-popup-text';
				text.append(title, time);
				const header = document.createElement('div');
				header.className = 'cairn-popup-header';
				const marker = markers.find((x) => x.id === id);
				let icon: ReturnType<typeof mount> | undefined;
				if (marker) {
					const iconBox = document.createElement('div');
					iconBox.className = 'cairn-popup-icon';
					icon = mount(MarkerIcon, { target: iconBox, props: { marker } });
					header.append(iconBox);
				}
				header.append(text);
				body.append(header, actions);
				const p = new maplibre.Popup({ offset: [0, -44], className: 'cairn-popup-root' })
					.setLngLat([lon, lat])
					.setDOMContent(body)
					.addTo(m);
				p.on('close', () => {
					stopPlayback();
					if (icon) unmount(icon);
					if (popup === p && moving === undefined) setSelected(undefined);
				});
				popup = p;
			}

			// Set by a long press; the click that ends it must not clear the pointer just placed.
			let suppressClick = false;
			m.on('click', (e) => {
				if (moving !== undefined) return;
				if (suppressClick) {
					suppressClick = false;
					return;
				}
				const f = m.queryRenderedFeatures(e.point, { layers: ['markers', 'markers-selected'] })[0];
				if (!f || f.geometry.type !== 'Point') {
					popup?.remove();
					setSelected(undefined);
					setPointer(undefined);
					return;
				}
				setPointer(undefined);
				const [lon, lat] = f.geometry.coordinates;
				select(f.properties.id, lon, lat);
			});

			// A long press on empty map places the pointer; a plain tap only clears it.
			const LONG_PRESS_MS = 500;
			const LONG_PRESS_SLOP = 10;
			let pressTimer: ReturnType<typeof setTimeout> | undefined;
			let pressStart: { x: number; y: number } | undefined;
			function cancelPress() {
				clearTimeout(pressTimer);
				pressTimer = undefined;
				pressStart = undefined;
			}
			function startPress(e: MapMouseEvent | MapTouchEvent) {
				cancelPress();
				suppressClick = false;
				if (moving !== undefined) return;
				if ('touches' in e.originalEvent && e.originalEvent.touches.length > 1) return;
				const hit = m.queryRenderedFeatures(e.point, { layers: ['markers', 'markers-selected'] });
				if (hit.length > 0) return;
				pressStart = { x: e.point.x, y: e.point.y };
				const at = { lng: e.lngLat.lng, lat: e.lngLat.lat };
				pressTimer = setTimeout(() => {
					pressTimer = undefined;
					suppressClick = true;
					popup?.remove();
					setSelected(undefined);
					setPointer(at);
				}, LONG_PRESS_MS);
			}
			function movePress(e: MapMouseEvent | MapTouchEvent) {
				if (!pressStart) return;
				if (Math.hypot(e.point.x - pressStart.x, e.point.y - pressStart.y) > LONG_PRESS_SLOP) {
					cancelPress();
				}
			}
			m.on('mousedown', startPress);
			m.on('touchstart', startPress);
			m.on('mousemove', movePress);
			m.on('touchmove', movePress);
			m.on('mouseup', cancelPress);
			m.on('touchend', cancelPress);
			m.on('touchcancel', cancelPress);
			m.on('dragstart', cancelPress);
			m.on('zoomstart', cancelPress);
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
						features: [{ ...feature, geometry: { type: 'Point', coordinates: [ll.lng, ll.lat] } }]
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
				const layers =
					moving !== undefined ? ['markers-selected'] : ['markers', 'markers-selected'];
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
		clearTimeout(statusTimer);
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
	{#if status}
		<p
			class="pointer-events-none absolute inset-x-4 top-4 z-10 m-0 rounded-lg bg-panel/90 p-3 text-center"
			role="status"
		>
			{status}
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
	{#if pointer && moving === undefined}
		<button
			type="button"
			class="absolute right-4 bottom-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#fbc02d] text-[#111111] shadow-lg transition active:scale-95"
			title="Add note"
			aria-label="Add note"
			onclick={() => (noteDialog = { title: 'Add note', text: '' })}
		>
			<svg
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
			>
		</button>
	{/if}
	{#if noteDialog}
		<NoteDialog
			title={noteDialog.title}
			bind:text={noteDialog.text}
			onsave={saveNote}
			oncancel={() => (noteDialog = undefined)}
		/>
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
					<svg
						width="28"
						height="28"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg
					>
				</button>
				<button
					type="button"
					class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#43a047] transition active:scale-95 text-white"
					title="Done"
					aria-label="Done"
					onclick={() => finishMove(true)}
				>
					<svg
						width="28"
						height="28"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="M5 12l5 5L20 7" /></svg
					>
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
		font-size: 1.5rem;
		width: 40px;
		height: 40px;
	}
	:global(.cairn-popup) {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 9rem;
		padding-right: 12px;
	}
	:global(.cairn-popup-header) {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	:global(.cairn-popup-icon) {
		width: 40px;
		height: 40px;
		flex-shrink: 0;
	}
	:global(.cairn-popup-text) {
		display: flex;
		flex-direction: column;
		gap: 4px;
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
		gap: 12px;
		margin-top: 8px;
	}
	:global(.cairn-popup-neutral) {
		background: #616161 !important;
		color: #ffffff !important;
	}
	:global(.cairn-popup-playing) {
		background: #43a047 !important;
		color: #ffffff !important;
	}
	:global(.cairn-popup-link) {
		width: auto;
		padding: 0 14px;
		font-weight: 600;
		text-decoration: none;
	}
	:global(.cairn-popup-delete) {
		background: #e53935 !important;
		color: #ffffff !important;
	}
	:global(.cairn-popup-button) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		padding: 0;
		border: 0;
		border-radius: 10px;
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
	:global(.cairn-popup-button svg) {
		width: 26px;
		height: 26px;
	}
	:global(.cairn-popup-button:active) {
		transform: scale(0.9);
		filter: brightness(0.9);
	}
</style>
