<script lang="ts">
	import SpeedSign from '../../lib/SpeedSign.svelte';
	import { playError, playSuccess, unlockAudio } from '../../lib/audio';
	import { addMarker } from '../../lib/markers';
	import { speedLimits, speedLimitTags } from '../../lib/presets';
	import { settings } from '../../lib/settings.svelte';

	// Latest fix from the continuous watch; unused in on-demand mode.
	let fix: GeolocationPosition | undefined;
	let status = $state('Waiting for GPS…');
	let flash = $state<number | undefined>();
	let flashTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (!('geolocation' in navigator)) {
			status = 'Geolocation not supported';
			return;
		}
		if (settings.gpsMode !== 'continuous') {
			fix = undefined;
			status = 'GPS on demand';
			return;
		}
		status = 'Waiting for GPS…';
		const id = navigator.geolocation.watchPosition(
			(pos) => {
				fix = pos;
				status = `GPS ±${Math.round(pos.coords.accuracy)} m`;
			},
			(err) => {
				status = `GPS error: ${err.message}`;
			},
			{ enableHighAccuracy: true, maximumAge: 2000 }
		);
		return () => navigator.geolocation.clearWatch(id);
	});

	$effect(() => () => clearTimeout(flashTimer));

	function getFix(): Promise<GeolocationPosition> {
		if (fix) return Promise.resolve(fix);
		return new Promise((resolve, reject) =>
			navigator.geolocation.getCurrentPosition(resolve, reject, {
				enableHighAccuracy: true,
				maximumAge: 3000,
				timeout: 10000
			})
		);
	}

	async function mark(speed: number) {
		// Must run synchronously inside the tap, before any await.
		unlockAudio();
		try {
			const { longitude, latitude, accuracy, heading, speed: v } = (await getFix()).coords;
			const dir = heading !== null && Number.isFinite(heading) ? heading : null;
			await addMarker({
				tags: speedLimitTags(speed, dir),
				lon: longitude,
				lat: latitude,
				accuracy,
				heading: dir,
				speed: v
			});
			status = `Saved ${speed} (±${Math.round(accuracy)} m)`;
			flash = speed;
			clearTimeout(flashTimer);
			flashTimer = setTimeout(() => (flash = undefined), 600);
			if (settings.sound) playSuccess();
		} catch (e) {
			status = `Not saved: ${e instanceof GeolocationPositionError ? e.message : String(e)}`;
			if (settings.sound) playError();
		}
	}
</script>

<div class="screen">
	<div class="grid">
		{#each speedLimits as speed (speed)}
			<div class="cell">
				<button
					class:saved={flash === speed}
					onclick={() => mark(speed)}
					aria-label="Speed limit {speed}"
				>
					<SpeedSign value={speed} />
				</button>
			</div>
		{/each}
	</div>
	<p class="status">{status}</p>
</div>

<style>
	.screen {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.grid {
		flex: 1;
		min-height: 0;
		display: grid;
		gap: 1rem;
		padding: 1rem;
		/* Portrait: 2 columns x 3 rows */
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-template-rows: repeat(3, minmax(0, 1fr));
	}

	@media (orientation: landscape) {
		.grid {
			/* Landscape: 3 columns x 2 rows */
			grid-template-columns: repeat(3, minmax(0, 1fr));
			grid-template-rows: repeat(2, minmax(0, 1fr));
		}
	}

	.cell {
		/* Size container: lets the button fit the cell's smaller dimension. */
		container-type: size;
		display: grid;
		place-items: center;
	}

	button {
		/* Square, as large as fits the cell in either orientation. */
		width: min(100cqw, 100cqh);
		height: min(100cqw, 100cqh);
		padding: 0.75rem;
		border: 0.2rem solid #333;
		border-radius: 1.5rem;
		background: #222;
		box-sizing: border-box;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background 0.15s;
	}

	button:active {
		background: #3a3a3a;
	}

	button.saved {
		background: #1f6b2f;
		border-color: #3fbf5a;
	}

	.status {
		margin: 0;
		padding: 0.25rem 1rem 0.5rem;
		font-size: 0.85rem;
		color: #999;
		text-align: center;
	}
</style>
