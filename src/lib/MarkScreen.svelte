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

	const PAGE_SIZE = 6;
	const SWIPE_MIN = 60; // px

	const pages = $derived(
		Array.from({ length: Math.max(1, Math.ceil(items.length / PAGE_SIZE)) }, (_, i) =>
			items.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE)
		)
	);
	let page = $state(0);
	// The item list can shrink (settings), leaving the page out of range.
	const current = $derived(Math.min(page, pages.length - 1));

	let touch: { x: number; y: number } | undefined;

	function onTouchStart(e: TouchEvent) {
		touch =
			e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : undefined;
	}

	/**
	 * Swipe up: the next page (higher values). Swipe down: the previous page, or, on the first
	 * page, the voice sheet (handled by the layout, so the event is left alone then).
	 */
	function onTouchEnd(e: TouchEvent) {
		if (!touch) return;
		const dx = e.changedTouches[0].clientX - touch.x;
		const dy = e.changedTouches[0].clientY - touch.y;
		touch = undefined;
		if (Math.abs(dy) < SWIPE_MIN || Math.abs(dy) <= 1.5 * Math.abs(dx)) return;
		if (dy < 0 && current < pages.length - 1) {
			page = current + 1;
		} else if (dy > 0 && current > 0) {
			page = current - 1;
			e.stopPropagation(); // not a voice sheet swipe
		}
	}

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

<div
	role="presentation"
	class="flex h-full flex-col"
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
>
	<!-- Pages stacked vertically; the track slides to the current one. -->
	<div class="min-h-0 flex-1 overflow-hidden">
		<div
			class="flex h-full flex-col transition-transform duration-200 motion-reduce:transition-none"
			style:transform={`translateY(${-current * 100}%)`}
		>
			{#each pages as pageItems, i (i)}
				<!-- Portrait: 2 columns x 3 rows; landscape: 3 x 2, side padding leaves room for the swipe hints. -->
				<div
					class="grid h-full min-h-0 flex-none grid-cols-2 grid-rows-3 gap-4 p-4 landscape:grid-cols-3 landscape:grid-rows-2 landscape:px-10"
					inert={i !== current}
				>
					{#each pageItems as item (item.id)}
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
			{/each}
		</div>
	</div>
	{#if pages.length > 1}
		<div class="flex justify-center gap-2 pb-1" aria-hidden="true">
			{#each pages as _, i (i)}
				<span class="size-2 rounded-full bg-ink {i === current ? 'opacity-80' : 'opacity-20'}"
				></span>
			{/each}
		</div>
	{/if}
	<!-- Side padding keeps long messages clear of the swipe hints. -->
	<p class="m-0 px-10 pt-1 pb-2 text-center text-[0.85rem] text-muted">{result || gps.status}</p>
</div>
