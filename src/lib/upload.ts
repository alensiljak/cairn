// Uploading markers to OSM as notes. A marker's position is where the mapper was, not
// necessarily where the feature is, so a note (for a human to turn into real OSM data) is the
// right form rather than a node.

import { markerLabel, markUploaded, type Marker } from './markers';
import { createNote, login, osm } from './osm.svelte';

/**
 * Note text for a marker: its name if it is a voice note (the recording itself isn't uploaded; the
 * number matches the item in the app), its tags one per line, and when it was recorded.
 */
export function noteText(m: Marker): string | undefined {
	const { note, ...rest } = m.tags;
	const tagLines = Object.entries(rest).map(([k, v]) => `${k}=${v}`);
	const body = [m.audio ? markerLabel(m) : undefined, note, tagLines.join('\n')]
		.filter(Boolean)
		.join('\n\n');
	const when = new Date(m.createdAt).toISOString().slice(0, 16).replace('T', ' ');
	return body ? `${body}\n\nRecorded with Cairn, ${when} UTC.` : undefined;
}

/** Whether a note can be made from the marker: it needs a position and something to say. */
export function canUpload(m: Marker): boolean {
	return m.lat !== null && m.lon !== null && noteText(m) !== undefined && !m.uploadedAt;
}

const inFlight = new Set<number>();

/**
 * Uploads the marker as a note and records that in the store (and on `m`). Without a login this
 * leaves for OSM's sign-in page instead and returns false. Throws if the upload fails.
 */
export async function uploadMarker(m: Marker): Promise<boolean> {
	if (!osm.token) {
		await login();
		return false;
	}
	// A second tap while the request is out would create a duplicate note.
	if (!canUpload(m) || inFlight.has(m.id!)) return false;
	inFlight.add(m.id!);
	try {
		const noteId = await createNote(m.lat!, m.lon!, noteText(m)!);
		const uploadedAt = Date.now();
		await markUploaded(m.id!, noteId, uploadedAt);
		Object.assign(m, { noteId, uploadedAt });
		return true;
	} finally {
		inFlight.delete(m.id!);
	}
}
