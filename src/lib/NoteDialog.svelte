<script lang="ts">
	let {
		title,
		text = $bindable(),
		onsave,
		oncancel
	}: { title: string; text: string; onsave: () => void; oncancel: () => void } = $props();
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
	role="presentation"
	onclick={oncancel}
>
	<div
		class="w-full max-w-sm rounded-2xl bg-panel p-5 shadow-xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="note-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && oncancel()}
	>
		<h2 id="note-title" class="m-0 text-lg font-semibold">{title}</h2>
		<!-- svelte-ignore a11y_autofocus -->
		<textarea
			class="mt-3 mb-4 box-border block w-full rounded-lg border border-white/20 bg-transparent p-2 text-ink"
			rows="3"
			autofocus
			bind:value={text}></textarea>
		<div class="flex justify-end gap-2">
			<button
				type="button"
				class="rounded-lg px-4 py-2 transition active:scale-95"
				onclick={oncancel}
			>
				Cancel
			</button>
			<button
				type="button"
				class="rounded-lg bg-[#43a047] px-4 py-2 font-semibold text-white transition active:scale-95"
				onclick={onsave}
			>
				Save
			</button>
		</div>
	</div>
</div>
