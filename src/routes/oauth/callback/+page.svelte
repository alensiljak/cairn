<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { completeLogin } from '../../../lib/osm.svelte';

	let error = $state<string | undefined>();

	onMount(async () => {
		try {
			const returnTo = await completeLogin(new URLSearchParams(location.search));
			// Replace, so Back doesn't return to this one-shot page.
			await goto(resolve(returnTo as '/'), { replaceState: true });
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	});
</script>

<div class="p-4 leading-normal">
	{#if error}
		<p>Could not sign in to OpenStreetMap: {error}</p>
		<p><a class="text-link" href={resolve('/settings')}>Back to settings</a></p>
	{:else}
		<p class="text-muted">Signing in to OpenStreetMap…</p>
	{/if}
</div>
