<script lang="ts">
	import { onMount } from 'svelte';
	import { deleteMarker, listMarkers, type Marker } from '../../lib/markers';

	let markers = $state<Marker[]>([]);
	let loaded = $state(false);

	async function refresh() {
		markers = await listMarkers();
		loaded = true;
	}

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
					>{Object.entries(m.tags)
						.map(([k, v]) => `${k}=${v}`)
						.join(' ')}</strong
				>
				<span>{m.lat.toFixed(5)}, {m.lon.toFixed(5)}</span>
				<span>{new Date(m.createdAt).toLocaleString()}</span>
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
