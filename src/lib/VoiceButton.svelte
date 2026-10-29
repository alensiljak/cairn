<script lang="ts">
	import Mic from '@lucide/svelte/icons/mic';
	import { voice } from './voice.svelte';

	/** Opens the voice note sheet; the big record button lives there. */
	let { onclick, sheetOpen }: { onclick: () => void; sheetOpen: boolean } = $props();
</script>

<button
	class:recording={voice.phase === 'recording'}
	class:starting={voice.phase === 'starting'}
	{onclick}
	aria-label="Voice note"
>
	<Mic />
	{#if voice.phase === 'recording'}<span>{voice.remaining}</span>{/if}
</button>

{#if voice.message && !sheetOpen}
	<p
		class="fixed bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] left-1/2 z-10 m-0 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm text-white {voice.ok
			? 'border-go bg-go-dark'
			: 'border-stop bg-stop-dark'}"
		role="status"
	>
		{voice.message}
	</p>
{/if}

<style>
	button {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		border: 0;
		border-radius: 0.5rem;
		padding: 0.5rem;
		min-width: 2.5rem;
		justify-content: center;
		background: var(--color-raised);
		color: var(--color-ink);
	}

	button.starting {
		background: var(--color-caution-dark);
	}

	button.recording {
		background: var(--color-stop);
		color: #fff;
		animation: pulse 1s infinite;
	}

	span {
		font-variant-numeric: tabular-nums;
		font-weight: bold;
	}

	@media (prefers-reduced-motion: no-preference) {
		@keyframes pulse {
			50% {
				opacity: 0.6;
			}
		}
	}
</style>
