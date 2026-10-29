// Position source shared by everything that records: the mark screens and voice notes.
// In continuous mode a watch keeps the latest fix ready, so recording needs no wait.

import { settings } from './settings.svelte';

export const gps = $state({ status: 'Waiting for GPS…' });

// Latest fix from the continuous watch; unused in on-demand mode.
let fix: GeolocationPosition | undefined;

/** Start the position source for the current GPS mode. Call from an `$effect`; returns its cleanup. */
export function startGps(): (() => void) | undefined {
	if (!('geolocation' in navigator)) {
		gps.status = 'Geolocation not supported';
		return;
	}
	if (settings.gpsMode !== 'continuous') {
		fix = undefined;
		gps.status = 'GPS on demand';
		return;
	}
	gps.status = 'Waiting for GPS…';
	const id = navigator.geolocation.watchPosition(
		(pos) => {
			fix = pos;
			gps.status = `GPS ±${Math.round(pos.coords.accuracy)} m`;
		},
		(err) => {
			gps.status = `GPS error: ${err.message}`;
		},
		{ enableHighAccuracy: true, maximumAge: 2000 }
	);
	return () => navigator.geolocation.clearWatch(id);
}

/** The latest fix, or a fresh one if the continuous watch has none. */
export function getFix(): Promise<GeolocationPosition> {
	if (fix) return Promise.resolve(fix);
	return new Promise((resolve, reject) =>
		navigator.geolocation.getCurrentPosition(resolve, reject, {
			enableHighAccuracy: true,
			maximumAge: 3000,
			timeout: 10000
		})
	);
}
