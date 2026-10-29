<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
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

	async function remove(id: number) {
		await deleteMarker(id);
		await refresh();
	}

	onMount(refresh);
</script>

<ul>
	{#each markers as m (m.id)}
		<li>
			<div class="info">
				<strong
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
			<button onclick={() => remove(m.id!)} aria-label="Delete">✕</button>
		</li>
	{:else}
		{#if loaded}<li class="empty">No items yet.</li>{/if}
	{/each}
</ul>

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 0.5rem 1rem;
	}

	li {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid #2c2c2c;
	}

	.info {
		flex: 1;
		display: flex;
		flex-direction: column;
		font-size: 0.85rem;
		color: #999;
	}

	strong {
		font-size: 1rem;
		color: #eee;
	}

	button {
		border: 0;
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: #2c2c2c;
		color: #eee;
	}

	.empty {
		color: #999;
		justify-content: center;
	}
</style>
