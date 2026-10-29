<script lang="ts">
	import { answer, dialog } from './confirm.svelte';

	let el: HTMLDialogElement;

	// A native modal <dialog> gives focus trapping and Esc handling.
	$effect(() => {
		if (dialog.open && !el.open) el.showModal();
		else if (!dialog.open && el.open) el.close();
	});
</script>

<!-- Clicking the backdrop (the dialog element itself, outside its content) cancels. -->
<dialog
	bind:this={el}
	oncancel={(e) => {
		e.preventDefault();
		answer(false);
	}}
	onclick={(e) => e.target === el && answer(false)}
	class="m-auto w-[min(90vw,24rem)] rounded-2xl border border-raised bg-panel p-6 text-ink backdrop:bg-black/70"
>
	<p class="m-0 mb-6 text-lg">{dialog.message}</p>
	<div class="flex gap-3">
		<!-- Cancel comes first so it gets the initial focus: the safe default. -->
		<button
			class="flex-1 rounded-xl border-0 bg-raised px-4 py-3 text-base text-ink active:brightness-125"
			onclick={() => answer(false)}
		>
			Cancel
		</button>
		<button
			class="flex-1 rounded-xl border-0 bg-stop px-4 py-3 text-base font-bold text-white active:brightness-125"
			onclick={() => answer(true)}
		>
			{dialog.confirmLabel}
		</button>
	</div>
</dialog>
