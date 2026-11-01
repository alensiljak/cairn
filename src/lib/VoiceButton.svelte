<script lang="ts">
	import { voice } from './voice.svelte';

	/** Result of a voice note while the sheet (swipe down) is closed. */
	let { sheetOpen }: { sheetOpen: boolean } = $props();
</script>

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
