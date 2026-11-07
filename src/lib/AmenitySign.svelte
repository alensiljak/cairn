<script lang="ts">
	import type { AmenityId } from './presets';

	// Pictograms for amenities, matching the other one-tap signs' 100x100 box.
	let { kind }: { kind: AmenityId } = $props();
</script>

<svg class="block h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
	{#if kind === 'parking'}
		<!-- The blue "P" square of the parking sign. -->
		<rect
			x="6"
			y="6"
			width="88"
			height="88"
			rx="10"
			fill="#1565c0"
			stroke="#fff"
			stroke-width="4"
		/>
		<path
			d="M36 78V22h18a17 17 0 0 1 0 34H36"
			fill="none"
			stroke="#fff"
			stroke-width="11"
			stroke-linejoin="round"
		/>
	{:else if kind === 'charging-station'}
		<rect
			x="6"
			y="6"
			width="88"
			height="88"
			rx="10"
			fill="#2e7d32"
			stroke="#fff"
			stroke-width="4"
		/>
		<!-- Lightning bolt. -->
		<path
			d="M56 12 28 54h20l-6 34 30-44H52z"
			fill="#fdd835"
			stroke="#fff"
			stroke-width="3"
			stroke-linejoin="round"
		/>
	{:else}
		<rect
			x="6"
			y="6"
			width="88"
			height="88"
			rx="10"
			fill="#0277bd"
			stroke="#fff"
			stroke-width="4"
		/>
		<!-- Water drops. -->
		<path d="M50 14C50 14 28 38 28 54a22 22 0 0 0 44 0C72 38 50 14 50 14z" fill="#e1f5fe" />
		<path
			d="M40 56a10 10 0 0 0 10 12"
			fill="none"
			stroke="#0277bd"
			stroke-width="5"
			stroke-linecap="round"
		/>
	{/if}
</svg>
