<script lang="ts" generics="T extends { id: string | number; label: string }">
	import type { Snippet } from 'svelte';
	import { playError, playSuccess, unlockAudio } from './audio';
	import { getFix, gps, startGps } from './gps.svelte';
	import { addMarker } from './markers';
	import { settings } from './settings.svelte';

	let {
		items,
		tags,
		sign
	}: {
		items: T[];
		/** OSM tags to save for a tapped item; `heading` is the direction of travel, if known. */
		tags: (item: T, heading: number | null) => Record<string, string>;
		sign: Snippet<[T]>;
	} = $props();

	// Result of the last tap; shown instead of the GPS status until the next GPS update.
	let result = $state('');
	let flash = $state<T['id'] | undefined>();
	let flashTimer: ReturnType<typeof setTimeout> | undefined;
	let resultTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(startGps);

	$effect(() => () => {
		clearTimeout(flashTimer);
		clearTimeout(resultTimer);
	});

	function show(message: string) {
		result = message;
		clearTimeout(resultTimer);
		resultTimer = setTimeout(() => (result = ''), 3000);
	}

	async function mark(item: T) {
		// Must run synchronously inside the tap, before any await.
		unlockAudio();
		try {
			const { longitude, latitude, accuracy, heading, speed } = (await getFix()).coords;
			const dir = heading !== null && Number.isFinite(heading) ? heading : null;
			await addMarker({
				tags: tags(item, dir),
				lon: longitude,
				lat: latitude,
				accuracy,
				heading: dir,
				speed
			});
			show(`Saved ${item.label} (±${Math.round(accuracy)} m)`);
			flash = item.id;
			clearTimeout(flashTimer);
			flashTimer = setTimeout(() => (flash = undefined), 600);
			if (settings.sound) playSuccess();
		} catch (e) {
			show(`Not saved: ${e instanceof GeolocationPositionError ? e.message : String(e)}`);
			if (settings.sound) playError();
		}
	}
</script>

<div class="flex h-full flex-col">
	<!-- Portrait: 2 columns x 3 rows; landscape: 3 x 2, side padding leaves room for the swipe hints. -->
	<div
		class="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-4 p-4 landscape:grid-cols-3 landscape:grid-rows-2 landscape:px-10"
	>
		{#each items as item (item.id)}
			<!-- Size container: lets the button fit the cell's smaller dimension. -->
			<div class="grid place-items-center [container-type:size]">
				<!-- Square, as large as fits the cell in either orientation. -->
				<button
					class="box-border h-[min(100cqw,100cqh)] w-[min(100cqw,100cqh)] cursor-pointer rounded-3xl border-[0.2rem] p-3 transition-colors duration-150 [-webkit-tap-highlight-color:transparent] {flash ===
					item.id
						? 'border-go bg-go-dark'
						: 'border-line bg-tile active:bg-tile-active'}"
					onclick={() => mark(item)}
					aria-label={item.label}
				>
					{@render sign(item)}
				</button>
			</div>
		{/each}
	</div>
	<!-- Side padding keeps long messages clear of the swipe hints. -->
	<p class="m-0 px-10 pt-1 pb-2 text-center text-[0.85rem] text-muted">{result || gps.status}</p>
</div>
