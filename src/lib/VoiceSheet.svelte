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
		class="sheet"
		role="dialog"
		aria-label="Voice note"
		tabindex="-1"
		ontouchstart={onTouchStart}
		ontouchend={onTouchEnd}
		transition:fly={{ y: -400, duration }}
	>
		<button class="close" onclick={() => (open = false)} aria-label="Close"><X /></button>

		<div class="levels" aria-hidden="true">
			{#each voice.levels as level, i (i)}
				<span style:height="{Math.max(level * 100, 0)}%"></span>
			{/each}
		</div>

		<button
			class="record"
			class:recording
			class:starting={voice.phase === 'starting'}
			onclick={tap}
			aria-label={recording ? 'Stop voice note' : 'Record voice note'}
		>
			{#if recording}
				<span class="count">{voice.remaining}</span>
				<small>tap to stop</small>
			{:else}
				<Mic size={96} />
			{/if}
		</button>

		<p class="hint">
			{voice.message || (recording ? 'Speak now' : 'Tap to record · swipe up to close')}
		</p>
	</div>
{/if}

<style>
	.sheet {
		position: absolute;
		inset: 0;
		z-index: 5;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		padding: 1rem;
		background: #111;
		touch-action: none;
	}

	.close {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		border: 0;
		border-radius: 0.5rem;
		padding: 0.5rem;
		background: #2c2c2c;
		color: #eee;
	}

	/* Scrolling level history: silence shows as a row of dots, speech as rising bars. */
	.levels {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		width: min(90%, 28rem);
		height: min(20dvh, 8rem);
	}

	.levels span {
		flex: 1;
		min-height: 0.35rem;
		max-width: 0.6rem;
		border-radius: 1rem;
		background: #8ab4f8;
		transition: height 0.07s linear;
	}

	.record {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: min(60vw, 40dvh);
		height: min(60vw, 40dvh);
		border: 0.3rem solid #444;
		border-radius: 50%;
		background: #2c2c2c;
		color: #eee;
		-webkit-tap-highlight-color: transparent;
	}

	.record:active {
		background: #3a3a3a;
	}

	.record.starting {
		background: #6b5a1f;
		border-color: #b89b2e;
	}

	.record.recording {
		background: #c62828;
		border-color: #ff6b6b;
	}

	.count {
		font-size: 4rem;
		font-weight: bold;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.hint {
		margin: 0;
		color: #999;
		text-align: center;
	}

	@media (orientation: landscape) {
		.sheet {
			flex-direction: row;
			gap: 3rem;
		}

		.levels {
			width: 40%;
			height: 50%;
		}

		.hint {
			position: absolute;
			bottom: 0.5rem;
		}
	}
</style>
