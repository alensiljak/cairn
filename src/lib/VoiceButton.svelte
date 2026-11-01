<script lang="ts">
	import Mic from '@lucide/svelte/icons/mic';
	import { voice } from './voice.svelte';

	/**
	 * Recording indicator (shown only while a note is being recorded; the sheet opens by swiping
	 * down), and the result of a voice note while the sheet is closed.
	 */
	let { onclick, sheetOpen }: { onclick: () => void; sheetOpen: boolean } = $props();
</script>

{#if voice.phase !== 'idle'}
	<button
		class="flex min-w-10 items-center justify-center gap-1 rounded-lg border-0 p-2 {voice.phase ===
		'recording'
			? 'bg-stop text-white motion-safe:animate-pulse'
			: 'bg-caution-dark text-ink'}"
		{onclick}
		aria-label="Voice note"
	>
		<Mic />
		{#if voice.phase === 'recording'}<span class="font-bold tabular-nums">{voice.remaining}</span
			>{/if}
	</button>
{/if}

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
