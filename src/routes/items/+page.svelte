<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { confirmDialog } from '../../lib/confirm.svelte';
	import { deleteMarker, listMarkers, type Marker } from '../../lib/markers';

	let markers = $state<Marker[]>([]);
	let loaded = $state(false);
	// Object URLs for voice note playback.
	let audioUrls = new Map<number, string>();

	function revokeUrls() {
		audioUrls.forEach((url) => URL.revokeObjectURL(url));
		audioUrls.clear();
	}

	async function refresh() {
		const list = await listMarkers();
		revokeUrls();
		for (const m of list) if (m.audio) audioUrls.set(m.id!, URL.createObjectURL(m.audio));
		markers = list;
		loaded = true;
	}

	onDestroy(revokeUrls);

	async function remove(m: Marker) {
		const what = m.audio ? 'this voice note' : 'this item';
		if (!(await confirmDialog(`Delete ${what}?`))) return;
		await deleteMarker(m.id!);
		await refresh();
	}

	onMount(refresh);
</script>

<ul class="m-0 list-none px-4 py-2">
	{#each markers as m (m.id)}
		<li class="flex items-center gap-4 border-b border-raised py-3">
			<div class="flex flex-1 flex-col text-[0.85rem] text-muted">
				<strong class="text-base text-ink"
					>{m.audio
						? 'Voice note'
						: Object.entries(m.tags)
								.map(([k, v]) => `${k}=${v}`)
								.join(' ')}</strong
				>
				<span>
					{m.lat !== null && m.lon !== null
						? `${m.lat.toFixed(5)}, ${m.lon.toFixed(5)}`
						: 'No position'}
				</span>
				<span>{new Date(m.createdAt).toLocaleString()}</span>
				{#if m.audio}
					<audio controls preload="none" src={audioUrls.get(m.id!)}></audio>
				{/if}
			</div>
			<button
				class="rounded-lg border-0 bg-raised px-3 py-2 text-ink"
				onclick={() => remove(m)}
				aria-label="Delete">✕</button
			>
		</li>
	{:else}
		{#if loaded}
			<li class="flex items-center justify-center gap-4 border-b border-raised py-3 text-muted">
				No items yet.
			</li>
		{/if}
	{/each}
</ul>
