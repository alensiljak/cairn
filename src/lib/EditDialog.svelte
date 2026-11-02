<script lang="ts">
	import type { Field } from './presets';

	// Details of a marker, edited when not driving: big choice buttons and a few text boxes.
	let {
		title,
		fields,
		values = $bindable(),
		onsave,
		oncancel
	}: {
		title: string;
		fields: Field[];
		values: Record<string, string>;
		onsave: () => void;
		oncancel: () => void;
	} = $props();

	/** Tapping the chosen option again clears it. */
	function choose(key: string, value: string) {
		values[key] = values[key] === value ? '' : value;
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
	role="presentation"
	onclick={oncancel}
>
	<div
		class="flex max-h-full w-full max-w-sm flex-col rounded-2xl bg-panel p-5 shadow-xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="edit-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && oncancel()}
	>
		<h2 id="edit-title" class="m-0 text-lg font-semibold">{title}</h2>
		<div class="mt-3 mb-4 flex min-h-0 flex-col gap-4 overflow-y-auto">
			{#each fields as field (field.key)}
				<div class="flex flex-col gap-1">
					<span class="text-[0.85rem] text-muted" id={`field-${field.key}`}>{field.label}</span>
					{#if field.options}
						<div class="flex flex-wrap gap-2" role="group" aria-labelledby={`field-${field.key}`}>
							{#each field.options as option (option.value)}
								<button
									type="button"
									class="rounded-lg border px-3 py-2 text-ink transition active:scale-95 {values[
										field.key
									] === option.value
										? 'border-go bg-go-dark font-semibold'
										: 'border-edge bg-raised'}"
									aria-pressed={values[field.key] === option.value}
									onclick={() => choose(field.key, option.value)}
								>
									{option.label}
								</button>
							{/each}
						</div>
					{:else}
						<input
							class="box-border block w-full rounded-lg border border-white/20 bg-transparent p-2 text-ink"
							type="text"
							aria-labelledby={`field-${field.key}`}
							placeholder={field.placeholder}
							bind:value={values[field.key]}
						/>
					{/if}
				</div>
			{/each}
		</div>
		<div class="flex justify-end gap-2">
			<button
				type="button"
				class="rounded-lg border-0 bg-transparent px-4 py-2 text-ink transition active:scale-95"
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
