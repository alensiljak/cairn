// Short audible feedback via Web Audio, so no asset files are needed.

let ctx: AudioContext | undefined;

/** Create/resume the audio context. Call synchronously from a user gesture (browsers require it). */
export function unlockAudio() {
	ctx ??= new AudioContext();
	if (ctx.state === 'suspended') void ctx.resume();
}

/** The shared audio context, once `unlockAudio` has run. */
export function getAudioContext() {
	return ctx;
}

/**
 * One tone. By default it fades out over its whole length (a soft ping). `body` (0..1) makes it
 * fuller: the level falls only to that fraction of `peak` by 60% of the length, then releases.
 */
function tone(
	freq: number,
	start: number,
	duration: number,
	type: OscillatorType = 'sine',
	{ peak = 0.5, body = 0 } = {}
) {
	if (!ctx) return;
	const t = ctx.currentTime + start;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = type;
	osc.frequency.value = freq;
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + 0.01);
	if (body > 0) gain.gain.exponentialRampToValueAtTime(peak * body, t + duration * 0.6);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
	osc.connect(gain).connect(ctx.destination);
	osc.start(t);
	osc.stop(t + duration + 0.02);
}

/** Two rising tones: saved. */
export function playSuccess() {
	tone(880, 0, 0.1);
	tone(1320, 0.12, 0.16);
}

/** One mid beep: recording starts now. */
export function playRecordStart() {
	tone(1000, 0, 0.15);
}

/** Two falling tones: recording ended (the start beep is a single tone). */
export function playRecordStop() {
	const full = { peak: 0.45, body: 0.5 };
	tone(1200, 0, 0.17, 'sine', full);
	tone(650, 0.13, 0.2, 'sine', full);
}

/** One low buzz: not saved. */
export function playError() {
	tone(180, 0, 0.4, 'sawtooth');
}
