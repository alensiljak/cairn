export type GpsMode = 'continuous' | 'on-demand';

export interface Settings {
	/** Category (see categories.ts) the app opens into. */
	defaultCategory: string;
	/** continuous: keep a GPS watch running; on-demand: request a fix on each tap. */
	gpsMode: GpsMode;
	/** Play a sound when a marker is saved (or fails). */
	sound: boolean;
}

const KEY = 'cairn.settings';
const defaults: Settings = { defaultCategory: 'speed-limits', gpsMode: 'continuous', sound: true };

function load(): Settings {
	try {
		return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
	} catch {
		return { ...defaults };
	}
}

export const settings = $state<Settings>(load());

export function saveSettings() {
	try {
		localStorage.setItem(KEY, JSON.stringify(settings));
	} catch {
		// Storage unavailable (private mode): settings last for this session only.
	}
}
