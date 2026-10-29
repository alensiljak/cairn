<script lang="ts">
	import { fly } from 'svelte/transition';
	import Mic from '@lucide/svelte/icons/mic';
	import X from '@lucide/svelte/icons/x';
	import { toggleVoice, voice } from './voice.svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const SWIPE_MIN = 60; // px
	// Pause after a saved note so the confirmation can be seen before the sheet slides away.
	const CLOSE_DELAY_MS = 800;

	const recording = $derived(voice.phase === 'recording');
	const duration = $derived(
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
			? 0
			: 200
	);

	async function tap() {
		if (await toggleVoice()) setTimeout(() => (open = false), CLOSE_DELAY_MS);
	}

	let touchY: number | undefined;

	function onTouchStart(e: TouchEvent) {
		touchY = e.touches.length === 1 ? e.touches[0].clientY : undefined;
	}

	/** Swiping up closes the sheet, the opposite of the swipe that opened it. */
	function onTouchEnd(e: TouchEvent) {
		if (touchY !== undefined && e.changedTouches[0].clientY - touchY <= -SWIPE_MIN) open = false;
		touchY = undefined;
	}
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && (open = false)} />

{#if open}
	<div
		class="absolute inset-0 z-5 flex touch-none flex-col items-center justify-center gap-8 bg-night p-4 landscape:flex-row landscape:gap-12"
		role="dialog"
		aria-label="Voice note"
		tabindex="-1"
		ontouchstart={onTouchStart}
		ontouchend={onTouchEnd}
		transition:fly={{ y: -400, duration }}
	>
		<button
			class="absolute top-2 right-2 flex rounded-lg border-0 bg-raised p-2 text-ink"
			onclick={() => (open = false)}
			aria-label="Close"
		>
			<X />
		</button>

		<!-- Scrolling level history: silence shows as a row of dots, speech as rising bars. -->
		<div
			class="flex h-[min(20dvh,8rem)] w-[min(90%,28rem)] items-center justify-center gap-[0.3rem] landscape:h-1/2 landscape:w-2/5"
			aria-hidden="true"
		>
			{#each voice.levels as level, i (i)}
				<span
					class="max-w-[0.6rem] min-h-[0.35rem] flex-1 rounded-full bg-go transition-[height] duration-75 ease-linear"
					style:height="{Math.max(level * 100, 0)}%"
				></span>
			{/each}
		</div>

		<button
			class="flex size-[min(60vw,40dvh)] flex-col items-center justify-center rounded-full border-[0.3rem] [-webkit-tap-highlight-color:transparent] {recording
				? 'border-stop bg-stop-dark text-white'
				: voice.phase === 'starting'
					? 'border-caution bg-caution-dark text-ink'
					: 'border-edge bg-raised text-ink active:bg-tile-active'}"
			onclick={tap}
			aria-label={recording ? 'Stop voice note' : 'Record voice note'}
		>
			{#if recording}
				<span class="text-[4rem] leading-none font-bold tabular-nums">{voice.remaining}</span>
				<small>tap to stop</small>
			{:else}
				<Mic size={96} />
			{/if}
		</button>

		<p
			class="m-0 text-center landscape:absolute landscape:bottom-2 {voice.message
				? voice.ok
					? 'text-go'
					: 'text-stop'
				: 'text-muted'}"
		>
			{voice.message || (recording ? 'Speak now' : 'Tap to record · swipe up to close')}
		</p>
	</div>
{/if}
