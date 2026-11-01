<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { confirmDialog } from '../../lib/confirm.svelte';
	import MarkerIcon from '../../lib/MarkerIcon.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Upload from '@lucide/svelte/icons/upload';
	import {
		deleteMarker,
		listMarkers,
		markerLabel,
		purgeUploaded,
		setNote,
		type Marker
	} from '../../lib/markers';
	import NoteDialog from '../../lib/NoteDialog.svelte';
	import { osmUrl } from '../../lib/osm.svelte';
	import { canUpload, uploadMarker } from '../../lib/upload';

	let markers = $state<Marker[]>([]);
	let loaded = $state(false);
	let error = $state<string | undefined>();
	const uploadedCount = $derived(markers.filter((m) => m.uploadedAt).length);
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

	async function upload(m: Marker) {
		error = undefined;
		try {
			await uploadMarker(m);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
		await refresh();
	}

	/** The voice note being transcribed; the dialog is closed while undefined. */
	let transcribing = $state<{ id: number; text: string } | undefined>();

	async function saveTranscript() {
		if (!transcribing) return;
		const { id, text } = transcribing;
		transcribing = undefined;
		await setNote(id, text.trim());
		await refresh();
	}

	async function purge() {
		const n = uploadedCount;
		if (!(await confirmDialog(`Delete ${n} uploaded ${n === 1 ? 'item' : 'items'}?`, 'Purge')))
			return;
		await purgeUploaded();
		await refresh();
	}

	onMount(refresh);
</script>

{#if transcribing}
	<NoteDialog
		title="Transcribe"
		bind:text={transcribing.text}
		onsave={saveTranscript}
		oncancel={() => (transcribing = undefined)}
	/>
{/if}
{#if error}
	<p class="m-4 rounded-lg bg-panel p-3 text-[#e53935]" role="alert">{error}</p>
{/if}
{#if uploadedCount > 0}
	<div class="mx-4 mt-2 flex items-center justify-between gap-3 rounded-lg bg-panel p-3">
		<span class="text-muted">{uploadedCount} uploaded as OSM notes</span>
		<button class="rounded-lg border-0 bg-raised px-3 py-2 text-ink" onclick={purge}>Purge</button>
	</div>
{/if}
<ul class="m-0 list-none px-4 py-2">
	{#each markers as m (m.id)}
		<li class="flex items-center gap-4 border-b border-raised py-3" class:opacity-50={m.uploadedAt}>
			<div class="h-10 w-10 shrink-0 text-ink"><MarkerIcon marker={m} /></div>
			<div class="flex min-w-0 flex-1 flex-col text-[0.85rem] text-muted">
				<strong class="text-base text-ink">{markerLabel(m)}</strong>
				<span>
					{m.lat !== null && m.lon !== null
						? `${m.lat.toFixed(5)}, ${m.lon.toFixed(5)}`
						: 'No position'}
				</span>
				<span>{new Date(m.createdAt).toLocaleString()}</span>
				{#if m.audio}
					<audio controls preload="none" class="mt-1 w-full min-w-0" src={audioUrls.get(m.id!)}
					></audio>
				{/if}
			</div>
			{#if m.audio && !m.uploadedAt}
				<button
					class="rounded-lg border-0 bg-raised px-3 py-2 text-ink"
					onclick={() => (transcribing = { id: m.id!, text: m.tags.note ?? '' })}
					aria-label="Transcribe"
					title="Transcribe"><Pencil size={18} /></button
				>
			{/if}
			{#if m.uploadedAt}
				<a
					class="rounded-lg bg-raised px-3 py-2 text-link"
					href={`${osmUrl}/note/${m.noteId}`}
					target="_blank"
					rel="noreferrer"
					title="Open the OSM note">Note</a
				>
			{:else if canUpload(m)}
				<button
					class="rounded-lg border-0 bg-raised px-3 py-2 text-ink"
					onclick={() => upload(m)}
					aria-label="Upload to OpenStreetMap as a note"
					title="Upload as OSM note"><Upload size={18} /></button
				>
			{/if}
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
