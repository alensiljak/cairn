// Voice notes: tap, hear a beep, speak; recording ends by itself after `settings.voiceSeconds`
// (or on a second tap). Audio is stored with the position where the note was started, if known;
// it works offline because nothing is transcribed here.

import { playError, playRecordStart, playRecordStop, unlockAudio } from './audio';
import { getFix } from './gps.svelte';
import { addMarker } from './markers';
import { settings } from './settings.svelte';

export const voice = $state({
	phase: 'idle' as 'idle' | 'starting' | 'recording',
	/** Whole seconds left while recording. */
	remaining: 0,
	/** Result of the last note, shown briefly. */
	message: ''
});

// Speech only, so a low bitrate mono codec is plenty. First supported type wins (Safari: mp4).
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
const BITS_PER_SECOND = 24000;
// Lets the start beep die away so it is not recorded.
const BEEP_GAP_MS = 250;

let recorder: MediaRecorder | undefined;
let messageTimer: ReturnType<typeof setTimeout> | undefined;

function say(message: string) {
	voice.message = message;
	clearTimeout(messageTimer);
	messageTimer = setTimeout(() => (voice.message = ''), 3000);
}

/** Start a voice note, or end the one in progress early. */
export async function toggleVoice() {
	if (voice.phase === 'recording') {
		if (recorder?.state === 'recording') recorder.stop();
		return;
	}
	if (voice.phase !== 'idle') return;

	// Must run synchronously inside the tap, before any await.
	unlockAudio();
	voice.phase = 'starting';
	voice.message = '';

	let stream: MediaStream | undefined;
	let ticker: ReturnType<typeof setInterval> | undefined;
	try {
		if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
			throw new Error('Recording not supported');
		}
		// The position that matters is where the note was started, so ask for it right away; it is
		// awaited only after recording. A note without a position is still worth keeping.
		const fix = getFix().catch(() => undefined);
		stream = await navigator.mediaDevices.getUserMedia({
			audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true }
		});

		const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
		const rec = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: BITS_PER_SECOND });
		recorder = rec;
		const chunks: Blob[] = [];
		rec.ondataavailable = (e) => {
			if (e.data.size) chunks.push(e.data);
		};
		const stopped = new Promise<void>((resolve) => (rec.onstop = () => resolve()));

		if (settings.sound) playRecordStart();
		await new Promise((resolve) => setTimeout(resolve, BEEP_GAP_MS));

		rec.start();
		voice.remaining = settings.voiceSeconds;
		voice.phase = 'recording';
		ticker = setInterval(() => {
			voice.remaining -= 1;
			if (voice.remaining <= 0 && rec.state === 'recording') rec.stop();
		}, 1000);
		await stopped;

		clearInterval(ticker);
		if (settings.sound) playRecordStop();
		const coords = (await fix)?.coords;
		await addMarker({
			tags: {},
			lon: coords?.longitude ?? null,
			lat: coords?.latitude ?? null,
			accuracy: coords?.accuracy ?? null,
			heading: coords?.heading != null && Number.isFinite(coords.heading) ? coords.heading : null,
			speed: coords?.speed ?? null,
			audio: new Blob(chunks, { type: rec.mimeType })
		});
		say(coords ? 'Voice note saved' : 'Voice note saved, no position');
	} catch (e) {
		if (settings.sound) playError();
		say(
			`Not saved: ${
				e instanceof GeolocationPositionError || e instanceof Error ? e.message : String(e)
			}`
		);
	} finally {
		clearInterval(ticker);
		stream?.getTracks().forEach((t) => t.stop());
		recorder = undefined;
		voice.phase = 'idle';
		voice.remaining = 0;
	}
}
