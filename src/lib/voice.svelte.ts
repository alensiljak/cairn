// Voice notes: tap, hear a beep, speak; recording ends by itself after `settings.voiceSeconds`
// (or on a second tap). Audio is stored with the position where the note was started, if known;
// it works offline because nothing is transcribed here.

import { getAudioContext, playError, playRecordStart, playRecordStop, unlockAudio } from './audio';
import { getFix } from './gps.svelte';
import { addMarker } from './markers';
import { settings } from './settings.svelte';

/** Number of bars in the level history shown while recording. */
export const LEVEL_BARS = 32;
const LEVEL_INTERVAL_MS = 70;

export const voice = $state({
	phase: 'idle' as 'idle' | 'starting' | 'recording',
	/** Whole seconds left while recording. */
	remaining: 0,
	/** Recent microphone levels, 0..1, oldest first; scrolls as new ones arrive. */
	levels: new Array<number>(LEVEL_BARS).fill(0),
	/** Result of the last note, shown briefly. */
	message: '',
	/** Whether `message` reports success, for colouring it. */
	ok: true
});

// Speech only, so a low bitrate mono codec is plenty. First supported type wins (Safari: mp4).
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
const BITS_PER_SECOND = 24000;
// Lets the start beep die away so it is not recorded.
const BEEP_GAP_MS = 250;

// The microphone is opened ahead of the tap ("armed") because a cold start garbles the first
// moments: the capture pipeline and echo/noise processing need time to settle. It is released
// when the sheet closes, or after this much idle time.
const ARM_IDLE_MS = 30_000;

let recorder: MediaRecorder | undefined;
let stream: MediaStream | undefined;
let acquiring: Promise<MediaStream> | undefined;
let stopMeter: (() => void) | undefined;
/** Whether the sheet is open, i.e. whether the microphone should be kept ready. */
let wanted = false;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let messageTimer: ReturnType<typeof setTimeout> | undefined;

function say(message: string, ok: boolean) {
	voice.message = message;
	voice.ok = ok;
	clearTimeout(messageTimer);
	messageTimer = setTimeout(() => (voice.message = ''), 3000);
}

/** Feed `voice.levels` from the microphone; returns the function that stops it. */
function startMeter(stream: MediaStream): () => void {
	const ctx = getAudioContext();
	if (!ctx) return () => {};
	const analyser = ctx.createAnalyser();
	analyser.fftSize = 512;
	// Not connected to the destination, so the microphone is never played back.
	const source = ctx.createMediaStreamSource(stream);
	source.connect(analyser);
	const data = new Uint8Array(analyser.fftSize);
	const timer = setInterval(() => {
		analyser.getByteTimeDomainData(data);
		let sum = 0;
		for (const v of data) sum += ((v - 128) / 128) ** 2;
		const rms = Math.sqrt(sum / data.length);
		// Square root: speech is quiet next to full scale, this spreads it over the bar height.
		voice.levels = [...voice.levels.slice(1), Math.min(1, Math.sqrt(rms) * 1.5)];
	}, LEVEL_INTERVAL_MS);
	return () => {
		clearInterval(timer);
		source.disconnect();
		voice.levels = new Array<number>(LEVEL_BARS).fill(0);
	};
}

/** The open microphone stream, opened if needed. Concurrent callers share one request. */
function acquire(): Promise<MediaStream> {
	if (stream?.getAudioTracks().some((t) => t.readyState === 'live')) {
		ensureMeter();
		return Promise.resolve(stream);
	}
	acquiring ??= navigator.mediaDevices
		.getUserMedia({ audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true } })
		.then((s) => {
			stream = s;
			ensureMeter();
			return s;
		})
		.finally(() => (acquiring = undefined));
	return acquiring;
}

/** The meter needs the audio context, which only exists once audio has been unlocked by a tap. */
function ensureMeter() {
	if (stream && !stopMeter && getAudioContext()) stopMeter = startMeter(stream);
}

function release() {
	clearTimeout(idleTimer);
	stopMeter?.();
	stopMeter = undefined;
	stream?.getTracks().forEach((t) => t.stop());
	stream = undefined;
}

/** Open the microphone ahead of time, so the first words of a note are not lost. */
export async function armVoice() {
	wanted = true;
	if (voice.phase !== 'idle' || !navigator.mediaDevices?.getUserMedia) return;
	try {
		await acquire();
	} catch {
		return; // reported when the note is actually started
	}
	clearTimeout(idleTimer);
	idleTimer = setTimeout(() => voice.phase === 'idle' && release(), ARM_IDLE_MS);
}

/** Release the microphone; one in use by a running note is released when that note ends. */
export function disarmVoice() {
	wanted = false;
	if (voice.phase === 'idle') release();
}

/**
 * Start a voice note, or end the one in progress early.
 * Resolves, once the note is over, to whether it was saved.
 */
export async function toggleVoice(): Promise<boolean> {
	if (voice.phase === 'recording') {
		if (recorder?.state === 'recording') recorder.stop();
		return false;
	}
	if (voice.phase !== 'idle') return false;

	// Must run synchronously inside the tap, before any await.
	unlockAudio();
	clearTimeout(idleTimer);
	voice.phase = 'starting';
	voice.message = '';

	let ticker: ReturnType<typeof setInterval> | undefined;
	try {
		if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
			throw new Error('Recording not supported');
		}
		// The position that matters is where the note was started, so ask for it right away; it is
		// awaited only after recording. A note without a position is still worth keeping.
		const fix = getFix().catch(() => undefined);
		// Already open when armed; opened here otherwise.
		await acquire();

		if (settings.sound) playRecordStart();
		await new Promise((resolve) => setTimeout(resolve, BEEP_GAP_MS));

		const chunks: Blob[] = [];
		let stopped!: Promise<void>;
		const begin = (s: MediaStream) => {
			const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
			const r = new MediaRecorder(s, { mimeType, audioBitsPerSecond: BITS_PER_SECOND });
			r.ondataavailable = (e) => {
				if (e.data.size) chunks.push(e.data);
			};
			stopped = new Promise<void>((resolve) => (r.onstop = () => resolve()));
			r.start();
			return r;
		};
		let rec: MediaRecorder;
		try {
			rec = begin(await acquire());
		} catch {
			// The armed stream went stale (track ended, device switched): retry once with a fresh one.
			release();
			rec = begin(await acquire());
		}
		recorder = rec;
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
		say(coords ? 'Voice note saved' : 'Voice note saved, no position', true);
		return true;
	} catch (e) {
		if (settings.sound) playError();
		say(
			`Not saved: ${
				e instanceof GeolocationPositionError || e instanceof Error ? e.message : String(e)
			}`,
			false
		);
		return false;
	} finally {
		clearInterval(ticker);
		recorder = undefined;
		voice.phase = 'idle';
		voice.remaining = 0;
		if (wanted) {
			// Sheet still open: stay armed for another note.
			idleTimer = setTimeout(release, ARM_IDLE_MS);
		} else {
			release();
		}
	}
}
